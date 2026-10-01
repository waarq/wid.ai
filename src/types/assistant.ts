import type { ISODateString, Traceable } from "./common"

/**
 * Evidence for an assistant answer. Uses the shared `Traceable` field names
 * (sourceSegmentId / sourceTimestamp) so one "Jump to source" component
 * renders sources for answers, decisions, actions and moments alike.
 */
export interface AnswerSource extends Traceable {
  /** Short verbatim excerpt from the cited segment. */
  quote?: string
  speakerName?: string
}

export type AnswerConfidence = "high" | "medium" | "low"

export interface MeetingAnswer {
  id: string
  meetingId: string
  question: string
  answer: string
  /** "answered" always has at least one source; "not_found" has none. */
  status: "answered" | "not_found"
  sources: AnswerSource[]
  confidence: AnswerConfidence
  createdAt: ISODateString
}

export interface SuggestedQuestion {
  id: string
  text: string
}
