import type { ReactNode } from "react"

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Wraps case-insensitive matches of `query` in <mark>. Returns plain text when there is no query. */
export function highlightText(text: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return text
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"))
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-sm bg-warning-soft px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export function countMatches(text: string, query: string): number {
  const q = query.trim()
  if (!q) return 0
  return text.split(new RegExp(escapeRegExp(q), "gi")).length - 1
}
