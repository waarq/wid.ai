import { formatDay } from "@/components/calls/format"
import type { ActionItem, ISODate } from "@/types"

const DAY_MS = 86_400_000

/** Parses a calendar date ("2026-10-04") as local midnight. */
function parseLocalDate(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export interface DueLabel {
  text: string
  overdue: boolean
}

/** "Overdue by 3 days", "Due today", "Due tomorrow", "Due in 4 days", "Due Oct 20". */
export function describeDue(item: Pick<ActionItem, "dueDate" | "status">, now: Date = new Date()): DueLabel | null {
  if (!item.dueDate) return null
  const due = parseLocalDate(item.dueDate)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((due.getTime() - today.getTime()) / DAY_MS)
  const closed = item.status === "completed" || item.status === "dismissed"
  if (closed) return { text: `Due ${formatDay(due.toISOString(), now)}`, overdue: false }
  if (diff < 0) return { text: `Overdue by ${-diff} ${diff === -1 ? "day" : "days"}`, overdue: true }
  if (diff === 0) return { text: "Due today", overdue: false }
  if (diff === 1) return { text: "Due tomorrow", overdue: false }
  if (diff < 7) return { text: `Due in ${diff} days`, overdue: false }
  return { text: `Due ${formatDay(due.toISOString(), now)}`, overdue: false }
}
