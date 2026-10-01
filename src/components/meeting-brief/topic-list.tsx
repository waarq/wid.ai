"use client"

import { formatTimestamp } from "@/components/calls/format"
import type { Topic } from "@/types"

import type { JumpHandler } from "./types"

interface TopicListProps {
  items: readonly Topic[]
  onJumpToSource: JumpHandler
}

/** Topics discussed with their time ranges. Click a range to jump to its start. */
export function TopicList({ items, onJumpToSource }: TopicListProps) {
  return (
    <ul className="divide-y divide-border">
      {items.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <span className="min-w-0 text-sm text-foreground">{t.label}</span>
          <button
            type="button"
            onClick={() => onJumpToSource({ sourceTimestamp: t.startTime })}
            aria-label={`Jump to ${t.label} at ${formatTimestamp(t.startTime)}`}
            className="shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          >
            {formatTimestamp(t.startTime)} - {formatTimestamp(t.endTime)}
          </button>
        </li>
      ))}
    </ul>
  )
}
