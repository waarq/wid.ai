import type { ISODateString, Seconds } from "./common"
import type { ConferenceProvider } from "./calendar"

export const CAPTURE_MODES = ["audio", "video", "transcript_only"] as const
export type CaptureMode = (typeof CAPTURE_MODES)[number]

/**
 * Client-side capture session state machine (owned by useCaptureStore):
 *
 *   idle -> ready -> capturing <-> paused -> processing -> transcribing
 *        -> understanding -> complete
 *   any active state -> failed
 *
 * Distinct from MeetingStatus, which is the server-side lifecycle of the
 * resulting meeting record.
 */
export const CAPTURE_STATUSES = [
  "idle",
  "ready",
  "capturing",
  "paused",
  "processing",
  "transcribing",
  "understanding",
  "complete",
  "failed",
] as const
export type CaptureStatus = (typeof CAPTURE_STATUSES)[number]

export interface CaptureState {
  status: CaptureStatus
  elapsedSeconds: Seconds
  meetingId?: string
  /** User-safe message when status is "failed". */
  error?: string
  mode?: CaptureMode
  startedAt?: ISODateString
}

export interface StartCaptureInput {
  /** Capture a known calendar event. Omit for an ad-hoc meeting. */
  calendarEventId?: string
  /** Required for ad-hoc capture; defaults to the event title otherwise. */
  title?: string
  mode: CaptureMode
  platform?: ConferenceProvider
}

export interface StopCaptureInput {
  elapsedSeconds: Seconds
}
