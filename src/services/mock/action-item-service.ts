import { endOfWeek, format } from "date-fns"

import { AppException } from "@/lib/utils/errors"
import type { ActionItemService } from "@/services/interfaces"
import {
  ACTION_ITEM_STATUSES,
  type ActionItem,
  type ActionItemListParams,
  type ActionItemStatus,
  type ListResponse,
  type Meeting,
  type UpdateActionItemInput,
} from "@/types"

import type { MockDb } from "./db"
import { mockCall, mockWrite } from "./runtime"
import { nowIso, paginate } from "./utils"

/*
 * Action items live inside their meeting's summary (single source of truth),
 * so a toggle here is immediately reflected in the meeting detail, its card
 * counts (stats), search and the assistant.
 */

const ACTIVE: ReadonlySet<ActionItemStatus> = new Set<ActionItemStatus>(["open", "in_progress"])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function today(): string {
  return format(new Date(), "yyyy-MM-dd")
}

function matchesDue(item: ActionItem, due: ActionItemListParams["due"]): boolean {
  if (!due) return true
  const now = today()
  switch (due) {
    case "no_deadline":
      return !item.dueDate
    case "overdue":
      return Boolean(item.dueDate && item.dueDate < now && ACTIVE.has(item.status))
    case "today":
      return item.dueDate === now
    case "this_week": {
      const end = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
      return Boolean(item.dueDate && item.dueDate >= now && item.dueDate <= end)
    }
  }
}

function isMine(db: MockDb, item: ActionItem): boolean {
  const me = db.me
  return item.assignee?.id === me.personId || item.assignee?.userId === me.userId
}

/** Open work first, then by due date (no deadline last), newest first. */
function compare(a: ActionItem, b: ActionItem): number {
  const activeA = ACTIVE.has(a.status) ? 0 : 1
  const activeB = ACTIVE.has(b.status) ? 0 : 1
  if (activeA !== activeB) return activeA - activeB
  const dueA = a.dueDate ?? "9999-12-31"
  const dueB = b.dueDate ?? "9999-12-31"
  if (dueA !== dueB) return dueA < dueB ? -1 : 1
  return Date.parse(b.createdAt) - Date.parse(a.createdAt)
}

function setStatus(item: ActionItem, status: ActionItemStatus): void {
  const now = nowIso()
  item.status = status
  item.completedAt = status === "completed" ? now : undefined
  item.updatedAt = now
}

function touch(meeting: Meeting): void {
  meeting.updatedAt = nowIso()
}

export class MockActionItemService implements ActionItemService {
  list(params: ActionItemListParams = {}): Promise<ListResponse<ActionItem>> {
    return mockCall("actionItems.list", (db) => {
      const statuses = params.status ? (Array.isArray(params.status) ? params.status : [params.status]) : null
      if (statuses?.some((s) => !(ACTION_ITEM_STATUSES as readonly string[]).includes(s))) {
        throw new AppException("validation_error", { details: { fieldErrors: { status: ["Unknown status."] } } })
      }
      const items = db
        .actionEntries()
        .map((e) => e.item)
        .filter(
          (item) =>
            (!params.meetingId || item.meetingId === params.meetingId) &&
            (!params.mine || isMine(db, item)) &&
            (!params.assigneeId || item.assignee?.id === params.assigneeId || item.assignee?.userId === params.assigneeId) &&
            // Dismissed items are hidden unless asked for explicitly.
            (statuses ? statuses.includes(item.status) : item.status !== "dismissed") &&
            matchesDue(item, params.due),
        )
        .sort(compare)
      return paginate(items, params)
    })
  }

  getById(id: string): Promise<ActionItem> {
    return mockCall("actionItems.getById", (db) => db.requireAction(id).item)
  }

  update(id: string, input: UpdateActionItemInput): Promise<ActionItem> {
    return mockWrite("actionItems.update", (db) => {
      const { item, meeting } = db.requireAction(id)
      const errors: Record<string, string[]> = {}
      if (input.title !== undefined && (input.title.trim().length === 0 || input.title.length > 200)) {
        errors.title = ["Add a short title (under 200 characters)."]
      }
      if (input.status !== undefined && !(ACTION_ITEM_STATUSES as readonly string[]).includes(input.status)) {
        errors.status = ["Unknown status."]
      }
      if (input.dueDate && (!ISO_DATE.test(input.dueDate) || Number.isNaN(Date.parse(input.dueDate)))) {
        errors.dueDate = ["Choose a valid date."]
      }
      const assignee =
        input.assigneeId === undefined || input.assigneeId === null
          ? undefined
          : meeting.participants.find((p) => p.id === input.assigneeId || p.userId === input.assigneeId)
      if (input.assigneeId && !assignee) errors.assigneeId = ["Assign this to someone who was in the meeting."]
      if (Object.keys(errors).length > 0) throw new AppException("validation_error", { details: { fieldErrors: errors } })

      if (input.title !== undefined) item.title = input.title.trim()
      if (input.description !== undefined) item.description = input.description?.trim() || undefined
      if (input.assigneeId !== undefined) item.assignee = assignee
      if (input.dueDate !== undefined) item.dueDate = input.dueDate ?? undefined
      if (input.status !== undefined) setStatus(item, input.status)
      else item.updatedAt = nowIso()
      touch(meeting)
      return item
    })
  }

  toggleComplete(id: string): Promise<ActionItem> {
    return mockWrite("actionItems.toggleComplete", (db) => {
      const { item, meeting } = db.requireAction(id)
      setStatus(item, item.status === "completed" ? "open" : "completed")
      touch(meeting)
      return item
    })
  }

  delete(id: string): Promise<void> {
    return mockWrite("actionItems.delete", (db) => {
      const { meeting } = db.requireAction(id)
      const summary = meeting.summary!
      summary.actionItems = summary.actionItems.filter((a) => a.id !== id)
      for (const moment of summary.keyMoments) if (moment.relatedId === id) moment.relatedId = undefined
      db.state.alerts = db.state.alerts.map((alert) =>
        alert.target.kind === "action_item" && alert.target.actionItemId === id
          ? { ...alert, target: { kind: "meeting", meetingId: meeting.id } }
          : alert,
      )
      for (const deal of db.state.deals) {
        if (deal.nextAction?.actionItemId === id) deal.nextAction = { ...deal.nextAction, actionItemId: undefined }
      }
      touch(meeting)
    })
  }
}
