import type { ISODate, ISODateString, MeetingRef, Seconds, TextRange, Traceable } from "./common"
import type { DealStage } from "./deal"
import type { ActionItemStatus } from "./insights"
import type { MeetingStatus } from "./meeting"

export const SEARCH_RESULT_TYPES = [
  "meeting",
  "transcript",
  "action",
  "decision",
  "deal",
  "person",
  "command",
] as const
export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number]

interface SearchResultBase {
  /** Unique within a result set; safe as a React key. */
  id: string
  title: string
  subtitle?: string
  /** Relevance, higher is better. Results arrive sorted. */
  score: number
}

export interface MeetingSearchResult extends SearchResultBase {
  type: "meeting"
  meetingId: string
  startedAt: ISODateString
  duration: Seconds
  participantCount: number
  status: MeetingStatus
}

export interface TranscriptSearchResult extends SearchResultBase, Traceable {
  type: "transcript"
  meeting: MeetingRef
  speakerName: string
  snippet: string
  highlights: TextRange[]
}

export interface ActionSearchResult extends SearchResultBase, Traceable {
  type: "action"
  actionItemId: string
  meeting: MeetingRef
  status: ActionItemStatus
  dueDate?: ISODate
  assigneeName?: string
}

export interface DecisionSearchResult extends SearchResultBase, Traceable {
  type: "decision"
  decisionId: string
  meeting: MeetingRef
}

export interface DealSearchResult extends SearchResultBase {
  type: "deal"
  dealId: string
  company: string
  stage: DealStage
}

export interface PersonSearchResult extends SearchResultBase {
  type: "person"
  personId: string
  email?: string
  company?: string
  meetingCount: number
}

export const COMMAND_IDS = [
  "search_meetings",
  "go_my_calls",
  "go_team_calls",
  "go_playlist",
  "go_alerts",
  "go_deals",
  "start_capture",
  "open_settings",
  "open_profile",
  "toggle_theme",
] as const
export type CommandId = (typeof COMMAND_IDS)[number]

export interface CommandSearchResult extends SearchResultBase {
  type: "command"
  commandId: CommandId
  /** Display keys, e.g. ["G", "M"]. */
  shortcut?: string[]
}

/** Discriminated on `type`. */
export type SearchResult =
  | MeetingSearchResult
  | TranscriptSearchResult
  | ActionSearchResult
  | DecisionSearchResult
  | DealSearchResult
  | PersonSearchResult
  | CommandSearchResult

export interface SearchParams {
  types?: SearchResultType[]
  /** Restrict to a single meeting. */
  meetingId?: string
  limit?: number
}
