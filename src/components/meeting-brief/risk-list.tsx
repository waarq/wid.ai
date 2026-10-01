"use client"

import { TriangleAlert } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { Risk, RiskSeverity } from "@/types"

import { SourceLink } from "./source-link"
import type { AddToPlaylistHandler, JumpHandler } from "./types"

const SEVERITY: Record<RiskSeverity, { label: string; variant: "danger" | "warning" | "muted" }> = {
  high: { label: "High severity", variant: "danger" },
  medium: { label: "Medium severity", variant: "warning" },
  low: { label: "Low severity", variant: "muted" },
}

interface RiskListProps {
  items: readonly Risk[]
  meetingTitle: string
  onJumpToSource: JumpHandler
  onAddToPlaylist?: AddToPlaylistHandler
}

/** Risks raised, with a text severity badge (never color alone). */
export function RiskList({ items, meetingTitle, onJumpToSource, onAddToPlaylist }: RiskListProps) {
  return (
    <ul className="divide-y divide-border">
      {items.map((r) => (
        <li key={r.id} className="grid grid-cols-[auto_1fr] gap-x-3 py-3 first:pt-0 last:pb-0">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 text-warning" />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
              <p className="text-sm font-medium text-foreground">{r.title}</p>
              <Badge variant={SEVERITY[r.severity].variant}>{SEVERITY[r.severity].label}</Badge>
            </div>
            {r.description ? <p className="text-sm text-muted-foreground">{r.description}</p> : null}
            {r.raisedBy ? (
              <p className="text-xs text-muted-foreground">
                Raised by <span className="text-foreground/80">{r.raisedBy.name}</span>
              </p>
            ) : null}
            <SourceLink
              source={r}
              meetingTitle={meetingTitle}
              onJump={onJumpToSource}
              playlist={
                onAddToPlaylist
                  ? { kind: "insight", title: r.title, meetingId: r.meetingId, onAdd: onAddToPlaylist }
                  : undefined
              }
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
