"use client"

import { ArrowUpRight, BookmarkPlus } from "lucide-react"

import { formatTimestamp } from "@/components/calls/format"
import { cn } from "@/lib/utils"
import type { PlaylistItemKind, Traceable } from "@/types"

import type { AddToPlaylistRequest, JumpHandler } from "./types"

interface SourceLinkProps {
  /** The insight's evidence (meetingId, sourceSegmentId, sourceTimestamp). */
  source: Pick<Traceable, "sourceSegmentId" | "sourceTimestamp"> & Partial<Pick<Traceable, "meetingId">>
  meetingTitle: string
  onJump: JumpHandler
  /** When set, a bookmark button saves this insight to the playlist. */
  playlist?: {
    kind: PlaylistItemKind
    title: string
    meetingId: string
    onAdd: (request: AddToPlaylistRequest) => void
  }
  className?: string
}

/**
 * The single traceability affordance (conventions section 6):
 * "Source: <meeting> · mm:ss · Jump to conversation". Every insight renders this.
 */
export function SourceLink({ source, meetingTitle, onJump, playlist, className }: SourceLinkProps) {
  const time = formatTimestamp(source.sourceTimestamp)
  return (
    <div className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground", className)}>
      <span className="min-w-0 max-w-full truncate">
        Source: <span className="text-foreground/80">{meetingTitle}</span>
      </span>
      <span aria-hidden>·</span>
      <span className="font-mono tabular-nums">{time}</span>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() =>
          onJump({ sourceTimestamp: source.sourceTimestamp, sourceSegmentId: source.sourceSegmentId })
        }
        aria-label={`Jump to conversation at ${time}`}
        className="inline-flex items-center gap-0.5 rounded-sm font-medium text-primary-ink outline-none transition-transform hover:underline focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
      >
        Jump to conversation
        <ArrowUpRight aria-hidden className="size-3" />
      </button>
      {playlist ? (
        <button
          type="button"
          onClick={() =>
            playlist.onAdd({
              kind: playlist.kind,
              title: playlist.title,
              meetingId: playlist.meetingId,
              sourceSegmentId: source.sourceSegmentId,
              sourceTimestamp: source.sourceTimestamp,
            })
          }
          aria-label={`Add to playlist: ${playlist.title}`}
          className="ml-1 inline-grid size-6 place-items-center rounded-sm text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94]"
        >
          <BookmarkPlus aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
