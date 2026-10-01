import type { ConferenceProvider } from "./calendar"
import type { CaptureMode } from "./capture"
import type { ISODateString, ListParams, PersonRef, Seconds } from "./common"
import type { AppError } from "./errors"
import type { MeetingSummary, Tag } from "./insights"

/**
 * Server-side lifecycle of a meeting record, in three phases:
 *
 *   capture:     upcoming -> ready_to_capture -> capturing <-> paused
 *   processing:  processing -> transcribing -> understanding
 *   terminal:    ready | failed
 *
 * The PRD lists "Ready" twice; the pre-capture one is `ready_to_capture`
 * and the processed one is `ready`.
 */
export const CAPTURE_PHASE_STATUSES = [
  "upcoming",
  "ready_to_capture",
  "capturing",
  "paused",
] as const
export const PROCESSING_PHASE_STATUSES = ["processing", "transcribing", "understanding"] as const
export const TERMINAL_STATUSES = ["ready", "failed"] as const

export const MEETING_STATUSES = [
  ...CAPTURE_PHASE_STATUSES,
  ...PROCESSING_PHASE_STATUSES,
  ...TERMINAL_STATUSES,
] as const

export type CapturePhaseStatus = (typeof CAPTURE_PHASE_STATUSES)[number]
export type ProcessingPhaseStatus = (typeof PROCESSING_PHASE_STATUSES)[number]
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number]
export type MeetingStatus = CapturePhaseStatus | ProcessingPhaseStatus | TerminalStatus

export function isProcessingStatus(status: MeetingStatus): status is ProcessingPhaseStatus {
  return (PROCESSING_PHASE_STATUSES as readonly MeetingStatus[]).includes(status)
}

export function isCapturePhaseStatus(status: MeetingStatus): status is CapturePhaseStatus {
  return (CAPTURE_PHASE_STATUSES as readonly MeetingStatus[]).includes(status)
}

export const MEETING_VISIBILITIES = ["private", "attendees", "team"] as const
/** Always displayed: "Private" / "Shared with attendees" / "Shared with team". */
export type MeetingVisibility = (typeof MEETING_VISIBILITIES)[number]

export type ParticipantRole = "host" | "attendee" | "guest"

/**
 * A person present in a meeting. `id` is also the `speakerId` used by
 * TranscriptSegment, so speakers and participants join on it.
 */
export interface Participant extends PersonRef {
  role: ParticipantRole
  /** Outside the user's workspace (e.g. a client). */
  isExternal: boolean
  company?: string
  /** Set when the participant is a WIT user in the workspace. */
  userId?: string
}

export type ProcessingStepId =
  | "upload"
  | "transcribe"
  | "understand"
  | "extract_decisions"
  | "extract_actions"

export type ProcessingStepStatus = "pending" | "active" | "complete" | "failed"

export interface ProcessingStep {
  id: ProcessingStepId
  status: ProcessingStepStatus
}

/** Explicit progress so processing is never hidden behind a bare spinner. */
export interface ProcessingProgress {
  meetingId: string
  status: ProcessingPhaseStatus | TerminalStatus
  steps: ProcessingStep[]
  startedAt: ISODateString
  completedAt?: ISODateString
  error?: AppError
}

/** Counts shown on meeting cards ("3 decisions · 4 actions · 1 question"). */
export interface MeetingStats {
  decisions: number
  actionItems: number
  openQuestions: number
  risks: number
}

export interface Meeting {
  id: string
  title: string
  /** Actual start once captured; scheduled start while upcoming. */
  startedAt: ISODateString
  /** Present once capture has stopped. */
  endedAt?: ISODateString
  /** Captured length in seconds (scheduled length while upcoming). */
  duration: Seconds
  participants: Participant[]
  status: MeetingStatus
  visibility: MeetingVisibility
  owner: PersonRef
  platform: ConferenceProvider
  captureMode: CaptureMode
  tags: Tag[]
  /** Present once status is "ready". */
  summary?: MeetingSummary
  stats?: MeetingStats
  /** Present while processing or after a processing failure. */
  processing?: ProcessingProgress
  calendarEventId?: string
  dealId?: string
  audioUrl?: string
  /** True when the current user is not the owner but was given access. */
  sharedWithMe: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

/**
 * Which collection a list request targets.
 * - my_calls:       meetings the user captured or has access to (My Calls "All")
 * - shared_with_me: meetings others shared with the user
 * - team:           Team Calls "Everyone"
 * - my_team:        Team Calls "My team"
 */
export type MeetingScope = "my_calls" | "shared_with_me" | "team" | "my_team"

export type MeetingDateRange = "all" | "today" | "this_week" | "this_month"

export type MeetingSort = "recent" | "oldest" | "longest"

export interface MeetingListParams extends ListParams {
  scope?: MeetingScope
  range?: MeetingDateRange
  status?: MeetingStatus | MeetingStatus[]
  /** Free text over title, participants and summary. */
  search?: string
  /** Team Calls "?member=" filter. */
  ownerId?: string
  participantId?: string
  tagId?: string
  dealId?: string
  sort?: MeetingSort
}

export interface CreateMeetingInput {
  title: string
  startedAt?: ISODateString
  calendarEventId?: string
  platform?: ConferenceProvider
  captureMode?: CaptureMode
  /** Defaults to the user's sharing preference (private unless changed). */
  visibility?: MeetingVisibility
  participants?: Array<Pick<Participant, "name" | "email" | "isExternal" | "company">>
}

export interface UpdateMeetingInput {
  title?: string
  visibility?: MeetingVisibility
  tagIds?: string[]
  /** null unlinks the deal. */
  dealId?: string | null
}
