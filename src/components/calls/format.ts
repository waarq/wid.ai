import type { Seconds } from "@/types"

const DAY_MS = 86_400_000

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "42 min", "1 h 05 min", "58 s". Mono-friendly, never fractional. */
export function formatDuration(seconds: Seconds): string {
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total} s`
  const mins = Math.round(total / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")} min`
}

/** "Today", "Yesterday", "Oct 1", "Oct 1, 2025". */
export function formatDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / DAY_MS)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays === -1) return "Tomorrow"
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

/** "Today · 9:30 AM". */
export function formatDayTime(iso: string, now: Date = new Date()): string {
  const time = new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  return `${formatDay(iso, now)}, ${time}`
}

/** "just now", "5m ago", "3h ago", "Yesterday", "Oct 1". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime()
  if (diff < 60_000) return "Just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < DAY_MS && startOfDay(now) === startOfDay(new Date(iso))) return `${Math.floor(diff / 3_600_000)}h ago`
  return formatDay(iso, now)
}

/** 3725 -> "1:02:05", 221 -> "03:41". */
export function formatTimestamp(seconds: Seconds): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""
  return (first + last).toUpperCase()
}
