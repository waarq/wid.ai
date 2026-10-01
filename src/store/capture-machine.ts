import type { CaptureMode, CaptureState, CaptureStatus } from "@/types"

/*
 * Pure capture-session state machine (no React, no Zustand, no I/O), so it can
 * be unit tested directly and reused by any recorder implementation.
 *
 *   idle -> ready -> capturing <-> paused -> processing -> transcribing
 *        -> understanding -> complete
 *   ready | capturing | paused | processing | transcribing | understanding -> failed
 *   any -> idle (reset)
 *
 * Time is never counted with intervals. The session stores timestamps
 * (`segmentStartedAt`) plus the capture time banked from earlier segments
 * (`accumulatedMs`), so elapsed time is exact across pauses, throttled
 * background tabs and page refreshes.
 *
 * Invalid transitions are no-ops: `transition` returns the same object
 * reference, so callers (and Zustand) can detect "nothing changed" cheaply.
 */

export interface CaptureSession {
  status: CaptureStatus
  meetingId?: string
  calendarEventId?: string
  title?: string
  mode?: CaptureMode
  /** Epoch ms when capture first started. */
  startedAt?: number
  /** Epoch ms when the current capturing stretch began. Unset while paused/stopped. */
  segmentStartedAt?: number
  /** Capture time banked from finished capturing stretches. */
  accumulatedMs: number
  /** Epoch ms when capture stopped. */
  stoppedAt?: number
  /** User-safe message when status is "failed". */
  error?: string
  /** Status the session failed from, so the UI can offer the right recovery. */
  failedFrom?: CaptureStatus
}

export type ProcessingCaptureStatus = Extract<
  CaptureStatus,
  "processing" | "transcribing" | "understanding" | "complete"
>

export type CaptureEvent =
  | { type: "prepare"; title?: string; mode?: CaptureMode; calendarEventId?: string }
  | { type: "start"; at: number; meetingId?: string; title?: string; mode?: CaptureMode; calendarEventId?: string }
  | { type: "pause"; at: number }
  | { type: "resume"; at: number }
  | { type: "stop"; at: number; meetingId?: string }
  | { type: "advance"; to: ProcessingCaptureStatus }
  | { type: "fail"; at: number; error: string }
  | { type: "reset" }

export type CaptureEventType = CaptureEvent["type"]

export const INITIAL_CAPTURE_SESSION: CaptureSession = Object.freeze({
  status: "idle",
  accumulatedMs: 0,
}) as CaptureSession

/** Statuses during which a recorder is live (capturing or paused). */
export const RECORDING_STATUSES = ["capturing", "paused"] as const satisfies readonly CaptureStatus[]

/** Statuses after stop while the meeting is being processed. */
export const PROCESSING_CAPTURE_STATUSES = [
  "processing",
  "transcribing",
  "understanding",
] as const satisfies readonly CaptureStatus[]

const PROCESSING_ORDER: readonly ProcessingCaptureStatus[] = [
  "processing",
  "transcribing",
  "understanding",
  "complete",
]

const FAILABLE: ReadonlySet<CaptureStatus> = new Set<CaptureStatus>([
  "ready",
  "capturing",
  "paused",
  "processing",
  "transcribing",
  "understanding",
])

/** Which statuses each event is valid from. */
const ALLOWED_FROM: Record<Exclude<CaptureEventType, "reset" | "fail" | "advance">, ReadonlySet<CaptureStatus>> = {
  prepare: new Set<CaptureStatus>(["idle", "ready", "complete", "failed"]),
  start: new Set<CaptureStatus>(["idle", "ready"]),
  pause: new Set<CaptureStatus>(["capturing"]),
  resume: new Set<CaptureStatus>(["paused"]),
  stop: new Set<CaptureStatus>(["capturing", "paused"]),
}

export function isRecordingStatus(status: CaptureStatus): boolean {
  return status === "capturing" || status === "paused"
}

export function isProcessingCaptureStatus(status: CaptureStatus): boolean {
  return status === "processing" || status === "transcribing" || status === "understanding"
}

/** True while a session is in progress (anything but idle/ready/complete/failed). */
export function isActiveCaptureStatus(status: CaptureStatus): boolean {
  return isRecordingStatus(status) || isProcessingCaptureStatus(status)
}

export function canTransition(session: CaptureSession, event: CaptureEvent): boolean {
  switch (event.type) {
    case "reset":
      return true
    case "fail":
      return FAILABLE.has(session.status)
    case "advance": {
      const from = PROCESSING_ORDER.indexOf(session.status as ProcessingCaptureStatus)
      const to = PROCESSING_ORDER.indexOf(event.to)
      // Forward only, and only once processing has begun. Skipping ahead is
      // allowed (the server may already be further along than we have seen).
      return from !== -1 && to > from
    }
    default:
      return ALLOWED_FROM[event.type].has(session.status)
  }
}

/** Banks the running stretch into accumulatedMs. Guards against clock skew. */
function bank(session: CaptureSession, at: number): number {
  if (session.segmentStartedAt === undefined) return session.accumulatedMs
  return session.accumulatedMs + Math.max(0, at - session.segmentStartedAt)
}

export function transition(session: CaptureSession, event: CaptureEvent): CaptureSession {
  if (!canTransition(session, event)) return session

  switch (event.type) {
    case "reset":
      return session.status === "idle" && session.accumulatedMs === 0 ? session : INITIAL_CAPTURE_SESSION

    case "prepare":
      return {
        status: "ready",
        accumulatedMs: 0,
        title: event.title,
        mode: event.mode,
        calendarEventId: event.calendarEventId,
      }

    case "start":
      return {
        status: "capturing",
        accumulatedMs: 0,
        meetingId: event.meetingId,
        title: event.title ?? session.title,
        mode: event.mode ?? session.mode,
        calendarEventId: event.calendarEventId ?? session.calendarEventId,
        startedAt: event.at,
        segmentStartedAt: event.at,
      }

    case "pause":
      return { ...session, status: "paused", accumulatedMs: bank(session, event.at), segmentStartedAt: undefined }

    case "resume":
      return { ...session, status: "capturing", segmentStartedAt: event.at }

    case "stop":
      return {
        ...session,
        status: "processing",
        accumulatedMs: bank(session, event.at),
        segmentStartedAt: undefined,
        stoppedAt: event.at,
        meetingId: event.meetingId ?? session.meetingId,
      }

    case "advance":
      return { ...session, status: event.to }

    case "fail":
      return {
        ...session,
        status: "failed",
        failedFrom: session.status,
        error: event.error,
        accumulatedMs: bank(session, event.at),
        segmentStartedAt: undefined,
      }
  }
}

/** Exact elapsed capture time at `now`, excluding paused time. */
export function getElapsedMs(session: CaptureSession, now: number): number {
  if (session.status === "capturing" && session.segmentStartedAt !== undefined) {
    return session.accumulatedMs + Math.max(0, now - session.segmentStartedAt)
  }
  return session.accumulatedMs
}

export function getElapsedSeconds(session: CaptureSession, now: number): number {
  return Math.floor(getElapsedMs(session, now) / 1000)
}

/** Projects the session onto the public CaptureState contract from @/types. */
export function toCaptureState(session: CaptureSession, now: number): CaptureState {
  return {
    status: session.status,
    elapsedSeconds: getElapsedSeconds(session, now),
    ...(session.meetingId ? { meetingId: session.meetingId } : {}),
    ...(session.error ? { error: session.error } : {}),
    ...(session.mode ? { mode: session.mode } : {}),
    ...(session.startedAt !== undefined ? { startedAt: new Date(session.startedAt).toISOString() } : {}),
  }
}

/** Formats seconds as "mm:ss" or "h:mm:ss" for the capture timer. */
export function formatCaptureClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const mm = String(minutes).padStart(2, "0")
  const ss = String(seconds).padStart(2, "0")
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}
