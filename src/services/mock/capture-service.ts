import { AppException, USER_SAFE_MESSAGES } from "@/lib/utils/errors"
import type { CaptureListener, CaptureService } from "@/services/interfaces"
import {
  INITIAL_CAPTURE_SESSION,
  isRecordingStatus,
  toCaptureState,
  transition,
  type CaptureSession,
} from "@/store/capture-machine"
import type { CaptureMode, CaptureState, Meeting, StartCaptureInput } from "@/types"

import { mockControls } from "./controls"
import { getMockDb, type MockDb } from "./db"
import { deleteMeetingOp, setCapturePausedOp, startCaptureOp, stopCaptureOp } from "./meeting-ops"
import { mockCall, mockWrite } from "./runtime"
import { nowIso } from "./utils"

/*
 * Recorder plug-in point. The mock recorder does nothing; a real one wraps
 * MediaRecorder (or a meeting-bot SDK) and reports failures through onError.
 * Swap it by passing another implementation to MockCaptureService, or build
 * an ApiCaptureService around the same interface.
 */
export interface CaptureRecorder {
  start(mode: CaptureMode): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  /** Resolves with the recording, if the recorder produces one. */
  stop(): Promise<Blob | null>
  discard(): Promise<void>
  onError(listener: (error: AppException) => void): () => void
}

export class NoopRecorder implements CaptureRecorder {
  private listeners = new Set<(error: AppException) => void>()
  async start(): Promise<void> {}
  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async stop(): Promise<Blob | null> {
    return null
  }
  async discard(): Promise<void> {}
  onError(listener: (error: AppException) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  /** Used by mock controls to simulate a dead device. */
  emitError(error: AppException): void {
    for (const listener of this.listeners) listener(error)
  }
}

const TICK_MS = 1000

/*
 * Drives the capture session machine (shared with useCaptureStore) and
 * persists every lifecycle change through the meeting record. The session
 * lives in the MockDb snapshot, so a refresh mid-capture resumes the timer.
 * Capture only ever starts from an explicit user action.
 */
export class MockCaptureService implements CaptureService {
  private readonly listeners = new Set<CaptureListener>()
  private ticker: ReturnType<typeof setInterval> | null = null

  constructor(private readonly recorder: CaptureRecorder = new NoopRecorder()) {
    this.recorder.onError((error) => void this.failActive(error.message))
    mockControls.onCaptureFailure(() => {
      if (this.recorder instanceof NoopRecorder) this.recorder.emitError(new AppException("capture_failed"))
      else void this.failActive(USER_SAFE_MESSAGES.capture_failed)
    })
  }

  private session(db: MockDb): CaptureSession {
    const session = db.state.capture?.session ?? INITIAL_CAPTURE_SESSION
    // After stop, mirror the meeting's server-side processing status.
    if (session.meetingId && !isRecordingStatus(session.status) && session.status !== "idle") {
      const meeting = db.findMeeting(session.meetingId)
      if (meeting) {
        db.refreshProcessing(meeting)
        const next =
          meeting.status === "ready"
            ? transition(session, { type: "advance", to: "complete" })
            : meeting.status === "failed"
              ? transition(session, { type: "fail", at: Date.now(), error: meeting.processing?.error?.message ?? USER_SAFE_MESSAGES.processing_failed })
              : meeting.status === "transcribing" || meeting.status === "understanding"
                ? transition(session, { type: "advance", to: meeting.status })
                : session
        if (next !== session && db.state.capture) db.state.capture.session = next
        return next
      }
    }
    return session
  }

  private setSession(db: MockDb, session: CaptureSession, createdMeeting?: boolean): CaptureState {
    db.state.capture = { session, createdMeeting: createdMeeting ?? db.state.capture?.createdMeeting ?? false }
    const state = toCaptureState(session, Date.now())
    this.emit(state)
    this.syncTicker(session)
    return state
  }

  private emit(state: CaptureState): void {
    for (const listener of this.listeners) {
      try {
        listener(state)
      } catch {
        // A faulty subscriber must not break capture.
      }
    }
  }

  private syncTicker(session: CaptureSession): void {
    const shouldTick = session.status === "capturing" && this.listeners.size > 0
    if (shouldTick && !this.ticker) {
      this.ticker = setInterval(() => {
        void getMockDb().then((db) => this.emit(toCaptureState(this.session(db), Date.now())))
      }, TICK_MS)
    } else if (!shouldTick && this.ticker) {
      clearInterval(this.ticker)
      this.ticker = null
    }
  }

  private async failActive(message: string): Promise<void> {
    const db = await getMockDb()
    const session = this.session(db)
    if (!isRecordingStatus(session.status) || !session.meetingId) return
    const meeting = db.findMeeting(session.meetingId)
    if (meeting) {
      meeting.status = "failed"
      meeting.endedAt = nowIso()
      meeting.processing = {
        meetingId: meeting.id,
        status: "failed",
        steps: [
          { id: "upload", status: "failed" },
          { id: "transcribe", status: "pending" },
          { id: "understand", status: "pending" },
          { id: "extract_decisions", status: "pending" },
          { id: "extract_actions", status: "pending" },
        ],
        startedAt: meeting.startedAt,
        error: new AppException("capture_failed").toJSON(),
      }
      db.touchMeeting(meeting)
    }
    this.setSession(db, transition(session, { type: "fail", at: Date.now(), error: message }))
    db.save()
  }

  getState(): Promise<CaptureState> {
    return mockCall("capture.getState", (db) => toCaptureState(this.session(db), Date.now()), { instant: true })
  }

  start(input: StartCaptureInput): Promise<CaptureState> {
    return mockWrite("capture.start", async (db) => {
      const current = this.session(db)
      if (isRecordingStatus(current.status)) {
        throw new AppException("conflict", { message: "A capture is already in progress. Stop it before starting another." })
      }
      const { meeting, created } = startCaptureOp(db, input)
      try {
        await this.recorder.start(meeting.captureMode)
      } catch (error) {
        if (created) deleteMeetingOp(db, meeting.id)
        throw error instanceof AppException ? error : new AppException("capture_failed", { cause: error })
      }
      const session = transition(INITIAL_CAPTURE_SESSION, {
        type: "start",
        at: Date.parse(meeting.startedAt),
        meetingId: meeting.id,
        title: meeting.title,
        mode: meeting.captureMode,
        calendarEventId: meeting.calendarEventId,
      })
      return this.setSession(db, session, created)
    })
  }

  pause(): Promise<CaptureState> {
    return mockWrite("capture.pause", async (db) => {
      const session = this.session(db)
      if (session.status !== "capturing" || !session.meetingId) {
        throw new AppException("conflict", { message: "There's no running capture to pause." })
      }
      await this.recorder.pause()
      setCapturePausedOp(db, session.meetingId, true)
      return this.setSession(db, transition(session, { type: "pause", at: Date.now() }))
    })
  }

  resume(): Promise<CaptureState> {
    return mockWrite("capture.resume", async (db) => {
      const session = this.session(db)
      if (session.status !== "paused" || !session.meetingId) {
        throw new AppException("conflict", { message: "There's no paused capture to resume." })
      }
      await this.recorder.resume()
      setCapturePausedOp(db, session.meetingId, false)
      return this.setSession(db, transition(session, { type: "resume", at: Date.now() }))
    })
  }

  stop(): Promise<Meeting> {
    return mockWrite("capture.stop", async (db) => {
      const session = this.session(db)
      if (!isRecordingStatus(session.status) || !session.meetingId) {
        throw new AppException("conflict", { message: "There's no capture to stop." })
      }
      await this.recorder.stop()
      const stopped = transition(session, { type: "stop", at: Date.now() })
      const meeting = stopCaptureOp(db, session.meetingId, { elapsedSeconds: stopped.accumulatedMs / 1000 })
      this.setSession(db, stopped)
      return db.present(meeting)
    })
  }

  discard(): Promise<CaptureState> {
    return mockWrite("capture.discard", async (db) => {
      const session = this.session(db)
      if (isRecordingStatus(session.status) && session.meetingId) {
        await this.recorder.discard()
        const meeting = db.findMeeting(session.meetingId)
        if (meeting && db.state.capture?.createdMeeting) {
          deleteMeetingOp(db, meeting.id)
        } else if (meeting) {
          meeting.status = "ready_to_capture"
          meeting.duration = 0
          db.touchMeeting(meeting)
        }
      }
      db.state.capture = null
      return this.setSession(db, INITIAL_CAPTURE_SESSION, false)
    })
  }

  subscribe(listener: CaptureListener): () => void {
    this.listeners.add(listener)
    void getMockDb()
      .then((db) => {
        const session = this.session(db)
        listener(toCaptureState(session, Date.now()))
        this.syncTicker(session)
      })
      .catch(() => undefined)
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0 && this.ticker) {
        clearInterval(this.ticker)
        this.ticker = null
      }
    }
  }
}
