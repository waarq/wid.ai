import type {
  ISODate,
  ISODateString,
  ListParams,
  MeetingRef,
  Money,
  PersonRef,
  Traceable,
} from "./common"

export const DEAL_STAGES = [
  "new",
  "discovery",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export type DealSignalKind =
  | "interest"
  | "concern"
  | "objection"
  | "decision_maker"
  | "budget"
  | "timeline"
  | "competitor"
  | "question"

export type DealSignalSentiment = "positive" | "negative" | "neutral"

/** Conversation-derived signal ("Pricing concern"). AI-generated, so traceable. */
export interface DealSignal extends Traceable {
  id: string
  kind: DealSignalKind
  sentiment: DealSignalSentiment
  label: string
}

export interface DealNextAction {
  title: string
  dueDate?: ISODate
  /** Present when the next action is a tracked action item. */
  actionItemId?: string
}

/**
 * Lightweight, meeting-driven deal. Not a CRM record: the source of truth is
 * the conversations it references.
 */
export interface Deal {
  id: string
  /** Demo companies only, e.g. "Northstar Labs". */
  company: string
  name: string
  value: Money | null
  stage: DealStage
  owner: PersonRef
  nextAction?: DealNextAction
  signals: DealSignal[]
  /** Linked meetings, newest first. */
  meetings: MeetingRef[]
  lastMeetingAt?: ISODateString
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface DealListParams extends ListParams {
  stage?: DealStage
  search?: string
  ownerId?: string
}

export interface CreateDealInput {
  company: string
  name?: string
  value?: Money
  stage: DealStage
  meetingIds?: string[]
}

export interface UpdateDealInput {
  company?: string
  name?: string
  value?: Money | null
  stage?: DealStage
  nextAction?: DealNextAction | null
}
