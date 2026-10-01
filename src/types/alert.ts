import type { ISODateString, ListParams, MeetingRef, PersonRef } from "./common"

/**
 * Alerts double as the global notification feed: the topbar NotificationMenu
 * and the /alerts page read the same entity through AlertService.
 */
export const ALERT_TYPES = [
  "meeting_ready",
  "processing_failed",
  "action_due",
  "mention",
  "decision_changed",
  "meeting_shared",
  "deal_update",
] as const
export type AlertType = (typeof ALERT_TYPES)[number]

/** Where "View meeting" / "View action" / "View meetings" navigates. */
export type AlertTarget =
  | { kind: "meeting"; meetingId: string }
  | { kind: "action_item"; meetingId: string; actionItemId: string }
  | { kind: "decision"; meetingId: string; decisionId: string }
  | { kind: "meetings"; meetingIds: string[] }
  | { kind: "deal"; dealId: string }

export interface Alert {
  id: string
  type: AlertType
  title: string
  body: string
  target: AlertTarget
  meeting?: MeetingRef
  /** Who triggered it, e.g. the person who mentioned or assigned. */
  actor?: PersonRef
  /** For decision_changed: "Oct 12" -> "Oct 15". */
  change?: { from: string; to: string }
  /** null while unread. */
  readAt: ISODateString | null
  createdAt: ISODateString
}

export const ALERT_FILTERS = ["all", "unread", "actions", "mentions", "decisions"] as const
export type AlertFilter = (typeof ALERT_FILTERS)[number]

export interface AlertListParams extends ListParams {
  filter?: AlertFilter
}
