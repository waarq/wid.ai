"use client"

import { ArrowDownToLine, FileText, Search, SearchX, X } from "lucide-react"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"

import { pluralize } from "@/components/calls/format"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Participant, TranscriptSegment } from "@/types"

import { countMatches } from "./highlight"
import { TranscriptSegmentRow } from "./transcript-segment-row"
import { TranscriptSkeleton } from "./transcript-skeleton"

/** How long after a manual scroll auto-follow stays paused. */
const USER_SCROLL_PAUSE_MS = 5000

interface TranscriptProps {
  segments: readonly TranscriptSegment[]
  /** Used for avatars; `speakerId` equals `Participant.id`. */
  participants: readonly Participant[]
  /** Segment under the playhead; gets the active highlight and is followed. */
  activeSegmentId?: string
  /** Segment to emphasise and scroll to after a "Jump to conversation". */
  highlightSegmentId?: string
  /** Click-to-seek. */
  onSeek: (seconds: number, segmentId: string) => void
  onAddToPlaylist?: (segment: TranscriptSegment) => void
  isLoading?: boolean
  className?: string
}

/**
 * Searchable, click-to-seek transcript. The list scrolls inside this component
 * (cap its height with `className`); the active segment is followed unless the
 * user scrolled recently. Long transcripts rely on `content-visibility: auto`.
 */
export function Transcript({
  segments,
  participants,
  activeSegmentId,
  highlightSegmentId,
  onSeek,
  onAddToPlaylist,
  isLoading = false,
  className,
}: TranscriptProps) {
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const listRef = useRef<HTMLDivElement>(null)
  const lastUserScroll = useRef(0)
  const [paused, setPaused] = useState(false)

  const participantById = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])

  const { visible, matchCount } = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return { visible: segments, matchCount: 0 }
    const filtered = segments.filter((s) => s.text.toLowerCase().includes(q) || s.speakerName.toLowerCase().includes(q))
    return {
      visible: filtered,
      matchCount: filtered.reduce((n, s) => n + countMatches(s.text, q), 0),
    }
  }, [segments, deferredQuery])

  const scrollToSegment = useCallback((segmentId: string, behavior: ScrollBehavior) => {
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>(`[data-segment-id="${CSS.escape(segmentId)}"]`)
    if (!list || !el || list.scrollHeight <= list.clientHeight) return
    const top = el.offsetTop - list.offsetTop - list.clientHeight / 2 + el.clientHeight / 2
    list.scrollTo({ top: Math.max(0, top), behavior })
  }, [])

  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // Follow the playhead unless the user scrolled recently.
  useEffect(() => {
    if (!activeSegmentId) return
    if (Date.now() - lastUserScroll.current < USER_SCROLL_PAUSE_MS) {
      setPaused(true)
      return
    }
    setPaused(false)
    scrollToSegment(activeSegmentId, prefersReducedMotion() ? "auto" : "smooth")
  }, [activeSegmentId, scrollToSegment])

  // A jump always scrolls, regardless of earlier manual scrolling.
  useEffect(() => {
    if (!highlightSegmentId) return
    lastUserScroll.current = 0
    scrollToSegment(highlightSegmentId, prefersReducedMotion() ? "auto" : "smooth")
  }, [highlightSegmentId, scrollToSegment])

  function noteUserScroll() {
    lastUserScroll.current = Date.now()
  }

  function resumeFollow() {
    lastUserScroll.current = 0
    setPaused(false)
    if (activeSegmentId) scrollToSegment(activeSegmentId, prefersReducedMotion() ? "auto" : "smooth")
  }

  if (isLoading) return <TranscriptSkeleton />
  if (segments.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No transcript yet"
        description="The transcript appears here once the recording has been transcribed."
      />
    )
  }

  const searching = deferredQuery.trim().length > 0
  return (
    <div className={cn("relative flex min-h-0 max-h-[75dvh] flex-col", className)}>
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript"
            aria-label="Search transcript"
            className="pl-8"
          />
        </div>
        {query ? (
          <Button type="button" variant="ghost" size="icon" aria-label="Clear search" onClick={() => setQuery("")}>
            <X aria-hidden />
          </Button>
        ) : null}
        <p className="sr-only" role="status" aria-live="polite">
          {searching ? `${pluralize(matchCount, "match")} in ${pluralize(visible.length, "segment")}` : ""}
        </p>
        {searching ? (
          <span aria-hidden className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {matchCount}
          </span>
        ) : null}
      </div>

      <div
        ref={listRef}
        onWheel={noteUserScroll}
        onTouchMove={noteUserScroll}
        onPointerDown={noteUserScroll}
        onKeyDown={noteUserScroll}
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {visible.length === 0 ? (
          <EmptyState icon={SearchX} title="No matches" description={`Nothing in this transcript matches "${deferredQuery.trim()}".`} />
        ) : (
          <ol className="divide-y divide-border">
            {visible.map((s) => (
              <TranscriptSegmentRow
                key={s.id}
                segment={s}
                participant={participantById.get(s.speakerId)}
                active={s.id === activeSegmentId}
                highlighted={s.id === highlightSegmentId}
                query={deferredQuery}
                onSeek={onSeek}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </ol>
        )}
      </div>

      {paused && activeSegmentId && !searching ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resumeFollow}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-float"
        >
          <ArrowDownToLine aria-hidden />
          Follow playback
        </Button>
      ) : null}
    </div>
  )
}
