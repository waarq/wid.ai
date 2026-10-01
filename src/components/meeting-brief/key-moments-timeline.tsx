"use client"

import { momentMeta } from "@/components/marketing/product/moment-meta"
import { formatTimestamp } from "@/components/calls/format"
import { cn } from "@/lib/utils"
import type { KeyMoment, Seconds } from "@/types"

import { SourceLink } from "./source-link"
import type { AddToPlaylistHandler, JumpHandler } from "./types"

interface KeyMomentsTimelineProps {
  moments: readonly KeyMoment[]
  /** Meeting length in seconds; sets the right edge of the timeline. */
  duration: Seconds
  meetingTitle: string
  onJumpToSource: JumpHandler
  onAddToPlaylist?: AddToPlaylistHandler
}

/**
 * Horizontal 00:00 to duration timeline with typed markers (fixed Lucide icon
 * per type), plus an ordered list below so every moment keeps its source link.
 */
export function KeyMomentsTimeline({
  moments,
  duration,
  meetingTitle,
  onJumpToSource,
  onAddToPlaylist,
}: KeyMomentsTimelineProps) {
  const sorted = [...moments].sort((a, b) => a.sourceTimestamp - b.sourceTimestamp)
  const span = Math.max(duration, ...sorted.map((m) => m.sourceTimestamp), 1)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[28rem] px-4">
          <div className="relative h-9">
            <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
            {sorted.map((m) => {
              const meta = momentMeta[m.type]
              const Icon = meta.icon
              const time = formatTimestamp(m.sourceTimestamp)
              return (
                <button
                  key={m.id}
                  type="button"
                  title={`${meta.label}: ${m.title} (${time})`}
                  aria-label={`${meta.label} at ${time}: ${m.title}. Jump to conversation`}
                  onClick={() => onJumpToSource({ sourceTimestamp: m.sourceTimestamp, sourceSegmentId: m.sourceSegmentId })}
                  style={{ left: `${Math.min(100, (m.sourceTimestamp / span) * 100)}%` }}
                  className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-border-strong bg-background outline-none transition-transform hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
                >
                  <Icon aria-hidden className={cn("size-3.5", meta.tone)} />
                </button>
              )
            })}
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
            <span>{formatTimestamp(0)}</span>
            <span>{formatTimestamp(span)}</span>
          </div>
        </div>
      </div>

      <ol className="divide-y divide-border">
        {sorted.map((m) => {
          const meta = momentMeta[m.type]
          const Icon = meta.icon
          return (
            <li key={m.id} className="grid grid-cols-[auto_1fr] gap-x-3 py-3 first:pt-0 last:pb-0">
              <Icon aria-hidden className={cn("mt-0.5 size-4", meta.tone)} />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  <span className="sr-only">{meta.label}: </span>
                  {m.title}
                </p>
                {m.description ? <p className="text-sm text-muted-foreground">{m.description}</p> : null}
                <SourceLink
                  source={m}
                  meetingTitle={meetingTitle}
                  onJump={onJumpToSource}
                  playlist={
                    onAddToPlaylist
                      ? {
                          kind: m.type === "decision" ? "decision" : m.type === "commitment" ? "commitment" : "insight",
                          title: m.title,
                          meetingId: m.meetingId,
                          onAdd: onAddToPlaylist,
                        }
                      : undefined
                  }
                />
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
