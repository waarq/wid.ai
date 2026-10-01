import type { Seconds, TextRange } from "./common"

/** Exactly as specified in the PRD. Times are seconds from recording start. */
export interface TranscriptSegment {
  id: string
  /** Matches `Participant.id`. */
  speakerId: string
  speakerName: string
  startTime: number
  endTime: number
  text: string
  /** 0..1 */
  confidence?: number
}

export type TranscriptStatus = "pending" | "ready" | "failed"

export interface Transcript {
  meetingId: string
  status: TranscriptStatus
  /** BCP 47 tag, e.g. "en". */
  language: string
  duration: Seconds
  segments: TranscriptSegment[]
}

export interface TranscriptSearchMatch {
  segmentId: string
  startTime: Seconds
  speakerName: string
  text: string
  highlights: TextRange[]
}
