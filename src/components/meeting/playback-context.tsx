"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createStore, useStore, type StoreApi } from "zustand"

import type { PlaybackCommand } from "./player/types"

/*
 * Jump-to-source: the single shared mechanism for a meeting page.
 *
 * Any insight (decision, action, moment, assistant source, transcript row)
 * calls `jumpTo({ sourceTimestamp, sourceSegmentId })`. That
 *   1. sends a seek command to the player,
 *   2. highlights and scrolls the transcript segment into view,
 *   3. mirrors the position into the URL (?t=<seconds>&segment=<id>) so it
 *      can be shared or survive a refresh.
 *
 * The store is per meeting page (not global) and holds UI state only.
 */

export interface JumpTarget {
  sourceTimestamp: number
  sourceSegmentId?: string
}

export interface JumpOptions {
  /** Start playback after seeking. Default false. */
  play?: boolean
  /** Scroll the transcript row into view. Default true. */
  scroll?: boolean
  /** Write ?t=&segment= into the URL. Default true. */
  updateUrl?: boolean
}

interface PlaybackState {
  currentTime: number
  playing: boolean
  activeSegmentId: string | undefined
  /** Segment flashed after a jump. `nonce` re-triggers the same segment. */
  highlight: { segmentId: string; nonce: number } | undefined
  command: PlaybackCommand | undefined
  report: (time: number, activeSegmentId: string | undefined) => void
  setPlaying: (playing: boolean) => void
  send: (command: Omit<PlaybackCommand, "nonce">) => void
  jumpTo: (target: JumpTarget, options?: JumpOptions) => void
  clearHighlight: () => void
}

const HIGHLIGHT_MS = 4000
const SCROLL_RETRY_MS = 4000

export const SEGMENT_ID_ATTRIBUTE = "data-segment-id"
/** Put on the element wrapping the transcript so jumps scroll the page to it. */
export const TRANSCRIPT_SECTION_ATTRIBUTE = "data-transcript-section"

function findSegmentElement(segmentId: string): HTMLElement | null {
  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(segmentId) : segmentId
  return (
    document.querySelector<HTMLElement>(`[${SEGMENT_ID_ATTRIBUTE}="${escaped}"]`) ??
    document.getElementById(`segment-${segmentId}`) ??
    document.getElementById(segmentId)
  )
}

/** Scrolls once the segment exists (the transcript may still be loading). */
function scrollToSegment(segmentId: string): () => void {
  const started = performance.now()
  let frame = 0
  const attempt = () => {
    const el = findSegmentElement(segmentId)
    if (el) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      // The transcript scrolls its own list to the row; the page only needs
      // to bring the transcript section into view.
      const section = el.closest<HTMLElement>(`[${TRANSCRIPT_SECTION_ATTRIBUTE}]`)
      if (section) section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
      else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" })
      return
    }
    if (performance.now() - started < SCROLL_RETRY_MS) frame = requestAnimationFrame(attempt)
  }
  frame = requestAnimationFrame(attempt)
  return () => cancelAnimationFrame(frame)
}

function writeUrl(target: JumpTarget): void {
  const url = new URL(window.location.href)
  url.searchParams.set("t", String(Math.max(0, Math.floor(target.sourceTimestamp))))
  if (target.sourceSegmentId) url.searchParams.set("segment", target.sourceSegmentId)
  else url.searchParams.delete("segment")
  // Native history API: Next.js 16 keeps its router in sync with it.
  window.history.replaceState(window.history.state, "", url)
}

function createPlaybackStore(initialTime: number): StoreApi<PlaybackState> {
  let nonce = 0
  let highlightTimer: ReturnType<typeof setTimeout> | undefined
  let cancelScroll: (() => void) | undefined

  return createStore<PlaybackState>()((set, get) => ({
    currentTime: initialTime,
    playing: false,
    activeSegmentId: undefined,
    highlight: undefined,
    command: undefined,
    report: (currentTime, activeSegmentId) => {
      const state = get()
      if (state.currentTime === currentTime && state.activeSegmentId === activeSegmentId) return
      set({ currentTime, activeSegmentId })
    },
    setPlaying: (playing) => {
      if (get().playing !== playing) set({ playing })
    },
    send: (command) => set({ command: { ...command, nonce: ++nonce } }),
    jumpTo: (target, options = {}) => {
      const { play = false, scroll = true, updateUrl = true } = options
      const time = Math.max(0, target.sourceTimestamp)
      set({
        command: { type: "seek", time, play, nonce: ++nonce },
        currentTime: time,
        highlight: target.sourceSegmentId ? { segmentId: target.sourceSegmentId, nonce } : undefined,
      })
      clearTimeout(highlightTimer)
      if (target.sourceSegmentId) {
        highlightTimer = setTimeout(() => set({ highlight: undefined }), HIGHLIGHT_MS)
        if (scroll) {
          cancelScroll?.()
          cancelScroll = scrollToSegment(target.sourceSegmentId)
        }
      }
      if (updateUrl) writeUrl(target)
    },
    clearHighlight: () => {
      clearTimeout(highlightTimer)
      set({ highlight: undefined })
    },
  }))
}

const PlaybackContext = createContext<StoreApi<PlaybackState> | null>(null)

export function MeetingPlaybackProvider({
  initialTime,
  initialSegmentId,
  children,
}: {
  /** From the `?t=` deep link. */
  initialTime?: number
  /** From the `?segment=` deep link. */
  initialSegmentId?: string
  children: ReactNode
}) {
  const [store] = useState(() => createPlaybackStore(initialTime ?? 0))

  // Deep link: seek and highlight once (the player and transcript pick it up when they mount).
  useEffect(() => {
    if (initialTime === undefined && !initialSegmentId) return
    store.getState().jumpTo(
      { sourceTimestamp: initialTime ?? 0, sourceSegmentId: initialSegmentId },
      { updateUrl: false },
    )
  }, [store, initialTime, initialSegmentId])

  return <PlaybackContext.Provider value={store}>{children}</PlaybackContext.Provider>
}

function usePlaybackStore(): StoreApi<PlaybackState> {
  const store = useContext(PlaybackContext)
  if (!store) throw new Error("usePlayback must be used inside <MeetingPlaybackProvider>")
  return store
}

export function usePlayback<T>(selector: (state: PlaybackState) => T): T {
  return useStore(usePlaybackStore(), selector)
}

/** Reads the current playback state at call time, without subscribing to updates. */
export function usePlaybackSnapshot(): () => PlaybackState {
  const store = usePlaybackStore()
  return store.getState
}

/** `(target) => void`: seek the player and scroll/highlight the transcript segment. */
export function useJumpToSource(): (target: JumpTarget, options?: JumpOptions) => void {
  return usePlayback((s) => s.jumpTo)
}

export function usePlaybackControls() {
  const send = usePlayback((s) => s.send)
  const playing = usePlayback((s) => s.playing)
  return {
    playing,
    play: () => send({ type: "play" }),
    pause: () => send({ type: "pause" }),
    toggle: () => send({ type: "toggle" }),
  }
}

export type { PlaybackState }
