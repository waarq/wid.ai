import type { CaptureState, Meeting, StartCaptureInput } from "@/types"

export type CaptureListener = (state: CaptureState) => void

/**
 * Client-side capture session. Owns the recorder (mocked today) and drives the
 * CaptureState machine; persists lifecycle changes through MeetingService.
 * useCaptureStore subscribes to it and mirrors state for the UI.
 *
 * Capture only ever starts from an explicit user action.
 */
export interface CaptureService {
  getState(): Promise<CaptureState>
  /** idle|ready -> capturing. Rejects if a session is already active. */
  start(input: StartCaptureInput): Promise<CaptureState>
  /** capturing -> paused */
  pause(): Promise<CaptureState>
  /** paused -> capturing */
  resume(): Promise<CaptureState>
  /** capturing|paused -> processing. Resolves with the meeting being processed. */
  stop(): Promise<Meeting>
  /** Abandons the session without creating a processed meeting. */
  discard(): Promise<CaptureState>
  /** Emits on every transition and timer tick. Returns an unsubscribe function. */
  subscribe(listener: CaptureListener): () => void
}
