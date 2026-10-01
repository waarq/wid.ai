import type {
  ISODate,
  ISODateString,
  ListParams,
  MeetingRef,
  Seconds,
  Tone,
  Traceable,
} from "./common"
import type { Participant } from "./meeting"

/*
 * AI-generated meeting insights. Every insight extends `Traceable`
 * (meetingId + sourceSegmentId + sourceTimestamp): an insight without
 * evidence is not a valid value of these types.
 */

export interface Decision extends Traceable {
  id: string
  /** The decision as a single statement: "Launch moved to October 15." */
  title: string
  context?: string
  decidedBy?: Participant
  /** Set when this decision replaces an earlier one (decision history). */
  supersedesDecisionId?: string
  createdAt: ISODateString
}

/** One point in the evolution of a decision across meetings. */
export interface DecisionHistoryEntry extends Traceable {
  decisionId: string
  meeting: MeetingRef
  /** Short value as of this meeting, e.g. "Oct 15". */
  value: string
  title: string
}

/** "Launch -> Oct 5 -> Oct 12 -> Oct 15". Entries are oldest first. */
export interface DecisionHistory {
  /** Stable subject of the decision, e.g. "Launch date". */
  subject: string
  entries: DecisionHistoryEntry[]
}

export const ACTION_ITEM_STATUSES = ["open", "in_progress", "completed", "dismissed"] as const
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number]

export interface ActionItem extends Traceable {
  id: string
  title: string
  description?: string
  assignee?: Participant
  /** Calendar date the item is due. Absent means "No deadline". */
  dueDate?: ISODate
  status: ActionItemStatus
  /** Source meeting, embedded so global action lists can render without a join. */
  meeting: MeetingRef
  completedAt?: ISODateString
  createdAt: ISODateString
  updatedAt: ISODateString
}

export type ActionItemDueFilter = "overdue" | "today" | "this_week" | "no_deadline"

export interface ActionItemListParams extends ListParams {
  meetingId?: string
  /** Only items assigned to the current user. */
  mine?: boolean
  assigneeId?: string
  status?: ActionItemStatus | ActionItemStatus[]
  due?: ActionItemDueFilter
}

export interface UpdateActionItemInput {
  title?: string
  description?: string | null
  /** Participant id; null unassigns. */
  assigneeId?: string | null
  /** null clears the deadline. */
  dueDate?: ISODate | null
  status?: ActionItemStatus
}

export type QuestionStatus = "open" | "answered"

export interface Question extends Traceable {
  id: string
  text: string
  askedBy?: Participant
  status: QuestionStatus
  /** Present when the question was answered later in the meeting. */
  answer?: string
}

export type RiskSeverity = "low" | "medium" | "high"

export interface Risk extends Traceable {
  id: string
  title: string
  description?: string
  severity: RiskSeverity
  raisedBy?: Participant
}

export const KEY_MOMENT_TYPES = ["decision", "commitment", "risk", "question", "insight"] as const
/** Each type maps to one Lucide icon in the UI (no emoji). */
export type KeyMomentType = (typeof KEY_MOMENT_TYPES)[number]

export interface KeyMoment extends Traceable {
  id: string
  type: KeyMomentType
  title: string
  description?: string
  /** Optional link to the structured insight this moment represents. */
  relatedId?: string
}

export interface Topic {
  id: string
  label: string
  startTime: Seconds
  endTime: Seconds
}

export interface Tag {
  id: string
  label: string
  tone: Tone
}

export interface MeetingSummary {
  overview: string
  keyPoints: string[]
  decisions: Decision[]
  actionItems: ActionItem[]
  questions: Question[]
  risks: Risk[]
  keyMoments: KeyMoment[]
  topics: Topic[]
}
