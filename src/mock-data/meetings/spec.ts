import type {
  ActionItemStatus,
  CaptureMode,
  ConferenceProvider,
  KeyMomentType,
  MeetingStatus,
  MeetingVisibility,
  ParticipantRole,
  ProcessingProgress,
  QuestionStatus,
  RiskSeverity,
} from "@/types"

import type { PersonKey } from "../people"
import type { TagKey } from "../tags"

/** One transcript line: speaker, start offset ("mm:ss"), text. End times are derived. */
export type Line = readonly [speaker: PersonKey, at: string, text: string]

export interface DecisionSpec {
  at: string
  title: string
  context?: string
  by?: PersonKey
  /** Id of the earlier decision this one replaces. */
  supersedes?: string
}

export interface ActionSpec {
  at: string
  title: string
  description?: string
  who?: PersonKey
  /** Days from the anchor day. Omit for "No deadline". */
  due?: number
  status: ActionItemStatus
}

export interface QuestionSpec {
  at: string
  text: string
  by?: PersonKey
  status: QuestionStatus
  answer?: string
}

export interface RiskSpec {
  at: string
  title: string
  description?: string
  severity: RiskSeverity
  by?: PersonKey
}

export interface MomentSpec {
  at: string
  type: KeyMomentType
  title: string
  description?: string
  /** 1-based reference to a structured insight in this meeting: d1, a2, q1, r1. */
  rel?: string
}

export interface TopicSpec {
  label: string
  from: string
  to: string
}

export interface InsightsSpec {
  overview: string
  keyPoints: string[]
  decisions: DecisionSpec[]
  actions: ActionSpec[]
  questions: QuestionSpec[]
  risks: RiskSpec[]
  moments: MomentSpec[]
  topics: TopicSpec[]
}

export interface MeetingSpec {
  /** Short slug used to derive every id: mtg_<slug>, seg_<slug>_01, dec_<slug>_1 ... */
  slug: string
  title: string
  /** Days from the anchor day, and local start time. */
  day: number
  time: string
  durationSec: number
  status: MeetingStatus
  visibility: MeetingVisibility
  platform: ConferenceProvider
  captureMode: CaptureMode
  owner: PersonKey
  participants: Array<readonly [PersonKey, ParticipantRole?]>
  tags: TagKey[]
  dealId?: string
  sharedWithMe: boolean
  calendarEventId?: string
  lines?: Line[]
  insights?: InsightsSpec
  processing?: Omit<ProcessingProgress, "meetingId">
}
