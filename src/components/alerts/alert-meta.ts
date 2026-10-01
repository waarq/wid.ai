import {
  AtSign,
  CalendarClock,
  CircleCheck,
  GitCompareArrows,
  Handshake,
  Share2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"

import type { Alert, AlertTarget, AlertType } from "@/types"

export const ALERT_TYPE_META: Record<AlertType, { label: string; icon: LucideIcon }> = {
  meeting_ready: { label: "Meeting ready", icon: CircleCheck },
  processing_failed: { label: "Processing failed", icon: TriangleAlert },
  action_due: { label: "Action item", icon: CalendarClock },
  mention: { label: "Mention", icon: AtSign },
  decision_changed: { label: "Decision changed", icon: GitCompareArrows },
  meeting_shared: { label: "Shared with you", icon: Share2 },
  deal_update: { label: "Deal update", icon: Handshake },
}

/** Where an alert leads. Query params are hints for the meeting detail page (Phase 3). */
export function alertHref(target: AlertTarget): string {
  switch (target.kind) {
    case "meeting":
      return `/my-calls/${target.meetingId}`
    case "action_item":
      return `/my-calls/${target.meetingId}?action=${target.actionItemId}`
    case "decision":
      return `/my-calls/${target.meetingId}?decision=${target.decisionId}`
    case "meetings":
      return "/my-calls"
    case "deal":
      return `/deals/${target.dealId}`
  }
}

export function alertActionLabel(target: AlertTarget): string {
  switch (target.kind) {
    case "meeting":
      return "View meeting"
    case "action_item":
      return "View action"
    case "decision":
      return "View decision"
    case "meetings":
      return "View meetings"
    case "deal":
      return "View deal"
  }
}

export function isUnread(alert: Alert): boolean {
  return alert.readAt === null
}
