"use client"

import { Gavel } from "lucide-react"

import { initials } from "@/components/calls/format"
import type { Decision } from "@/types"

import { SourceLink } from "./source-link"
import type { AddToPlaylistHandler, JumpHandler } from "./types"

interface DecisionListProps {
  items: readonly Decision[]
  meetingTitle: string
  onJumpToSource: JumpHandler
  onAddToPlaylist?: AddToPlaylistHandler
}

/** Decisions made in the meeting, each with who decided and its source. */
export function DecisionList({ items, meetingTitle, onJumpToSource, onAddToPlaylist }: DecisionListProps) {
  return (
    <ul className="divide-y divide-border">
      {items.map((d) => (
        <li key={d.id} className="grid grid-cols-[auto_1fr] gap-x-3 py-3 first:pt-0 last:pb-0">
          <Gavel aria-hidden className="mt-0.5 size-4 text-primary-ink" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{d.title}</p>
            {d.context ? <p className="text-sm text-muted-foreground">{d.context}</p> : null}
            {d.decidedBy ? (
              <p className="text-xs text-muted-foreground">
                Decided by <span className="text-foreground/80">{d.decidedBy.name}</span>
                <span className="sr-only"> ({initials(d.decidedBy.name)})</span>
              </p>
            ) : null}
            <SourceLink
              source={d}
              meetingTitle={meetingTitle}
              onJump={onJumpToSource}
              playlist={
                onAddToPlaylist
                  ? { kind: "decision", title: d.title, meetingId: d.meetingId, onAdd: onAddToPlaylist }
                  : undefined
              }
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
