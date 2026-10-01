"use client"

import { BookmarkPlus } from "lucide-react"
import type { Ref } from "react"

import { formatTimestamp, initials } from "@/components/calls/format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Participant, TranscriptSegment } from "@/types"

import { highlightText } from "./highlight"

interface TranscriptSegmentRowProps {
  segment: TranscriptSegment
  /** Matching participant (same id as `segment.speakerId`) for the avatar image. */
  participant?: Participant
  /** True for the segment under the playhead. */
  active?: boolean
  /** True for a segment a "Jump to conversation" just landed on. */
  highlighted?: boolean
  /** Search text to mark inside the segment. */
  query?: string
  onSeek: (seconds: number, segmentId: string) => void
  onAddToPlaylist?: (segment: TranscriptSegment) => void
  ref?: Ref<HTMLLIElement>
}

/**
 * One transcript line: avatar with initials, speaker name, mono timestamp
 * (click to seek) and readable text. Speakers are told apart by name and
 * initials, never by color alone.
 */
export function TranscriptSegmentRow({
  segment,
  participant,
  active = false,
  highlighted = false,
  query = "",
  onSeek,
  onAddToPlaylist,
  ref,
}: TranscriptSegmentRowProps) {
  const time = formatTimestamp(segment.startTime)
  return (
    <li
      ref={ref}
      id={`segment-${segment.id}`}
      data-segment-id={segment.id}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group/segment relative grid grid-cols-[auto_1fr] gap-x-3 border-l-2 border-transparent px-3 py-3 [contain-intrinsic-size:auto_5rem] [content-visibility:auto]",
        active && "border-primary bg-primary-soft",
        highlighted && !active && "border-warning bg-warning-soft",
      )}
    >
      <Avatar size="sm" className="mt-0.5">
        {participant?.avatarUrl ? <AvatarImage src={participant.avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials(segment.speakerName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{segment.speakerName}</span>
          <button
            type="button"
            onClick={() => onSeek(segment.startTime, segment.id)}
            aria-label={`Play from ${time}, ${segment.speakerName}`}
            className="rounded-sm px-1 font-mono text-xs tabular-nums text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
          >
            {time}
          </button>
          {onAddToPlaylist ? (
            <button
              type="button"
              onClick={() => onAddToPlaylist(segment)}
              aria-label={`Add to playlist: ${segment.speakerName} at ${time}`}
              className="ml-auto grid size-6 place-items-center rounded-sm text-muted-foreground opacity-100 outline-none transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.94] sm:opacity-0 sm:group-hover/segment:opacity-100"
            >
              <BookmarkPlus aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>
        <p
          onClick={() => onSeek(segment.startTime, segment.id)}
          className="mt-0.5 cursor-pointer text-base leading-relaxed text-foreground"
        >
          {highlightText(segment.text, query)}
        </p>
      </div>
    </li>
  )
}
