import type { Ref } from "react"

import type { TranscriptSegment } from "@/types"

/**
 * Declarative command channel for a controlled player. Each new `nonce`
 * is executed once, so the same seek can be issued twice in a row.
 */
export interface PlaybackCommand {
  type: "play" | "pause" | "toggle" | "seek"
  /** Seconds, for "seek". */
  time?: number
  /** For "seek": start playing after seeking. */
  play?: boolean
  nonce: number
}

/** Imperative handle for consumers that prefer refs. */
export interface AudioPlayerHandle {
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (seconds: number, options?: { play?: boolean }) => void
  getCurrentTime: () => number
}

export interface AudioPlayerProps {
  /** Omit for mock mode: playback is simulated with a timer and stays in sync with the transcript. */
  audioUrl?: string
  /** Total length in seconds. */
  duration: number
  /** Used to show who is speaking and to report the active segment. */
  segments: TranscriptSegment[]
  /** Controlled command channel (seek/play/pause from outside). */
  command?: PlaybackCommand
  /** Ref-style control; named so it passes through `next/dynamic` untouched. */
  handleRef?: Ref<AudioPlayerHandle>
  /** Called about 4 times a second while playing, and on every seek. */
  onTimeUpdate?: (seconds: number, activeSegment: TranscriptSegment | undefined) => void
  onPlayingChange?: (playing: boolean) => void
  /** Accessible name for the player region. */
  label?: string
  className?: string
}
