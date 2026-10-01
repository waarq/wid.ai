import { create } from "zustand"
import { persist } from "zustand/middleware"

import { CAPTURE_MODES, CAPTURE_STATUSES, type CaptureMode, type CaptureState, type CaptureStatus } from "@/types"

import {
  INITIAL_CAPTURE_SESSION,
  isActiveCaptureStatus,
  toCaptureState,
  transition,
  type CaptureEvent,
  type CaptureSession,
  type ProcessingCaptureStatus,
} from "./capture-machine"
import { safeSessionStorage } from "./storage"

/*
 * Client-side capture UI state. A thin Zustand shell around the pure machine
 * in `capture-machine.ts`: every action dispatches one event, and invalid
 * transitions are no-ops.
 *
 * This store holds no server data. The meeting record lives in TanStack Query
 * (useMeeting / useProcessingStatus); the recorder lives behind
 * `services.capture` (CaptureService), which is the plug-in point for a real
 * MediaRecorder or SDK. `useCaptureController()` in `@/hooks` is the glue:
 * it calls the service, then dispatches here.
 *
 * Persisted to sessionStorage (per tab) so a refresh mid-capture recovers the
 * timer and the meeting id. Nothing sensitive is stored.
 */

export interface CaptureStoreState {
  session: CaptureSession
  /** Raw dispatch, for adapters that already speak CaptureEvent. */
  dispatch: (event: CaptureEvent) => void
  /** idle -> ready: the user opened the capture panel for a meeting. */
  prepare: (input?: { title?: string; mode?: CaptureMode; calendarEventId?: string }) => void
  /** idle|ready -> capturing. Call after the recorder has actually started. */
  start: (input?: { meetingId?: string; title?: string; mode?: CaptureMode; calendarEventId?: string }) => void
  pause: () => void
  resume: () => void
  /** capturing|paused -> processing. */
  stop: (meetingId?: string) => void
  /** Forward-only through processing -> transcribing -> understanding -> complete. */
  advance: (to: ProcessingCaptureStatus) => void
  fail: (error: string) => void
  reset: () => void
}

const optionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined
const optionalString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined)

/** Storage is user-controlled input: anything malformed restarts from idle. */
export function sanitizeCaptureSession(value: unknown): CaptureSession {
  if (typeof value !== "object" || value === null) return INITIAL_CAPTURE_SESSION
  const raw = value as Record<string, unknown>
  const status = raw.status
  if (typeof status !== "string" || !(CAPTURE_STATUSES as readonly string[]).includes(status)) return INITIAL_CAPTURE_SESSION
  const accumulatedMs = optionalNumber(raw.accumulatedMs)
  if (accumulatedMs === undefined || accumulatedMs < 0) return INITIAL_CAPTURE_SESSION
  const mode = optionalString(raw.mode)
  const failedFrom = optionalString(raw.failedFrom)
  return {
    status: status as CaptureStatus,
    accumulatedMs,
    meetingId: optionalString(raw.meetingId),
    calendarEventId: optionalString(raw.calendarEventId),
    title: optionalString(raw.title),
    mode: mode && (CAPTURE_MODES as readonly string[]).includes(mode) ? (mode as CaptureMode) : undefined,
    startedAt: optionalNumber(raw.startedAt),
    segmentStartedAt: optionalNumber(raw.segmentStartedAt),
    stoppedAt: optionalNumber(raw.stoppedAt),
    error: optionalString(raw.error),
    failedFrom:
      failedFrom && (CAPTURE_STATUSES as readonly string[]).includes(failedFrom) ? (failedFrom as CaptureStatus) : undefined,
  }
}

function apply(
  set: (partial: Partial<CaptureStoreState>) => void,
  get: () => CaptureStoreState,
  event: CaptureEvent,
): void {
  const current = get().session
  const next = transition(current, event)
  if (next !== current) set({ session: next })
}

export const useCaptureStore = create<CaptureStoreState>()(
  persist(
    (set, get) => ({
      session: INITIAL_CAPTURE_SESSION,
      dispatch: (event) => apply(set, get, event),
      prepare: (input = {}) => apply(set, get, { type: "prepare", ...input }),
      start: (input = {}) => apply(set, get, { type: "start", at: Date.now(), ...input }),
      pause: () => apply(set, get, { type: "pause", at: Date.now() }),
      resume: () => apply(set, get, { type: "resume", at: Date.now() }),
      stop: (meetingId) => apply(set, get, { type: "stop", at: Date.now(), meetingId }),
      advance: (to) => apply(set, get, { type: "advance", to }),
      fail: (error) => apply(set, get, { type: "fail", at: Date.now(), error }),
      reset: () => apply(set, get, { type: "reset" }),
    }),
    {
      name: "wid-capture",
      version: 1,
      storage: safeSessionStorage<Pick<CaptureStoreState, "session">>(),
      partialize: (state) => ({ session: state.session }),
      // Anything unrecognised starts clean rather than in a half-valid state.
      migrate: () => ({ session: INITIAL_CAPTURE_SESSION }),
      merge: (persisted, current) => ({
        ...current,
        session: sanitizeCaptureSession((persisted as { session?: unknown } | undefined)?.session),
      }),
      skipHydration: true,
    },
  ),
)

/* Selectors: subscribe to the narrowest slice to avoid re-render storms. */

export const selectCaptureSession = (s: CaptureStoreState): CaptureSession => s.session
export const selectCaptureStatus = (s: CaptureStoreState): CaptureStatus => s.session.status
export const selectCaptureMeetingId = (s: CaptureStoreState): string | undefined => s.session.meetingId
export const selectCaptureError = (s: CaptureStoreState): string | undefined => s.session.error
export const selectCaptureTitle = (s: CaptureStoreState): string | undefined => s.session.title
export const selectIsCaptureActive = (s: CaptureStoreState): boolean => isActiveCaptureStatus(s.session.status)
export const selectIsRecording = (s: CaptureStoreState): boolean =>
  s.session.status === "capturing" || s.session.status === "paused"

/** Snapshot in the public CaptureState shape (elapsed computed at call time). */
export function getCaptureStateSnapshot(now = Date.now()): CaptureState {
  return toCaptureState(useCaptureStore.getState().session, now)
}
