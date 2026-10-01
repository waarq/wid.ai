"use client"

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { Pause, Play, RotateCcw, RotateCw, Volume1, Volume2, VolumeX } from "lucide-react"

import { formatTimestamp } from "@/components/calls/format"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useStoreHydration } from "@/store/hydration"
import {
  PLAYBACK_RATES,
  selectPlaybackRate,
  selectVolume,
  usePreferencesStore,
  type PlaybackRate,
} from "@/store/preferences-store"

import { findActiveSegment, sortSegments } from "./segments"
import type { AudioPlayerProps } from "./types"

const SKIP_SECONDS = 5
/** Display refresh granularity while playing (seconds of media time). */
const DISPLAY_STEP = 0.1
/** How often time is reported to the parent while playing (ms of wall time). */
const REPORT_MS = 250

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(0, value), Math.max(0, max))
}

function rateLabel(rate: number): string {
  return `${rate}x`
}

/**
 * Reusable, backend-independent audio player.
 *
 * - With `audioUrl` it drives an <audio> element.
 * - Without one (or if the file fails to load) it simulates playback with
 *   a frame clock, so transcript sync and jump-to-source still work.
 *
 * Controls: play/pause, scrubber, current/duration, 5s skip, speed
 * (0.75 to 2x, remembered), volume (remembered). Keyboard inside the
 * player: Space or K toggles, J/L or arrow keys on the scrubber skip 5s.
 */
export function AudioPlayer({
  audioUrl,
  duration,
  segments,
  command,
  handleRef,
  onTimeUpdate,
  onPlayingChange,
  label = "Meeting playback",
  className,
}: AudioPlayerProps) {
  const prefsHydrated = useStoreHydration(usePreferencesStore)
  const storedRate = usePreferencesStore(selectPlaybackRate)
  const storedVolume = usePreferencesStore(selectVolume)
  const setStoredRate = usePreferencesStore((s) => s.setPlaybackRate)
  const setStoredVolume = usePreferencesStore((s) => s.setVolume)
  const rate: PlaybackRate = prefsHydrated ? storedRate : 1
  const volume = prefsHydrated ? storedVolume : 1

  const [audioFailed, setAudioFailed] = useState(false)
  const simulated = !audioUrl || audioFailed
  const [mediaDuration, setMediaDuration] = useState<number | null>(null)
  const total = Math.max(0, mediaDuration ?? duration)

  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeRef = useRef(0)
  const lastReportRef = useRef(0)
  const sorted = useMemo(() => sortSegments(segments), [segments])
  const active = useMemo(() => findActiveSegment(sorted, time), [sorted, time])

  // Latest callbacks without re-subscribing effects.
  const callbacks = useRef({ onTimeUpdate, onPlayingChange })
  useEffect(() => {
    callbacks.current = { onTimeUpdate, onPlayingChange }
  })

  const report = useCallback(
    (seconds: number) => {
      lastReportRef.current = performance.now()
      callbacks.current.onTimeUpdate?.(seconds, findActiveSegment(sorted, seconds))
    },
    [sorted],
  )

  const applyPlaying = useCallback((next: boolean) => {
    setPlaying(next)
    callbacks.current.onPlayingChange?.(next)
  }, [])

  const seek = useCallback(
    (seconds: number, options: { play?: boolean } = {}) => {
      const next = clamp(seconds, total)
      timeRef.current = next
      setTime(next)
      const audio = audioRef.current
      if (!simulated && audio) audio.currentTime = next
      report(next)
      if (options.play) {
        if (!simulated && audio) void audio.play().catch(() => setAudioFailed(true))
        applyPlaying(true)
      }
    },
    [total, simulated, report, applyPlaying],
  )

  const play = useCallback(() => {
    if (total <= 0) return
    // Restart from the top when play is pressed at the end.
    if (timeRef.current >= total - 0.05) seek(0)
    const audio = audioRef.current
    if (!simulated && audio) void audio.play().catch(() => setAudioFailed(true))
    applyPlaying(true)
  }, [total, simulated, seek, applyPlaying])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!simulated && audio) audio.pause()
    applyPlaying(false)
  }, [simulated, applyPlaying])

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play])
  const skip = useCallback((delta: number) => seek(timeRef.current + delta), [seek])

  useImperativeHandle(
    handleRef,
    () => ({ play, pause, toggle, seek, getCurrentTime: () => timeRef.current }),
    [play, pause, toggle, seek],
  )

  // Execute each external command once.
  const handledNonce = useRef(0)
  useEffect(() => {
    if (!command || command.nonce === handledNonce.current) return
    handledNonce.current = command.nonce
    // Commands come from an external store; apply them as an event, after commit.
    queueMicrotask(() => {
      switch (command.type) {
        case "seek":
          seek(command.time ?? 0, { play: command.play })
          break
        case "play":
          play()
          break
        case "pause":
          pause()
          break
        case "toggle":
          toggle()
          break
      }
    })
  }, [command, seek, play, pause, toggle])

  // Media element settings.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = rate
    audio.volume = volume
    audio.muted = muted
  }, [rate, volume, muted, simulated])

  // Frame clock: advances simulated time, or samples the media element.
  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const audio = audioRef.current
      let next = simulated || !audio ? timeRef.current + dt * rate : audio.currentTime
      if (next >= total) {
        next = total
        timeRef.current = next
        setTime(next)
        report(next)
        applyPlaying(false)
        return
      }
      timeRef.current = next
      setTime((shown) => (Math.abs(next - shown) >= DISPLAY_STEP ? next : shown))
      if (now - lastReportRef.current >= REPORT_MS) report(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, simulated, rate, total, report, applyPlaying])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const isRange = target instanceof HTMLInputElement && target.type === "range"
    if (target.closest("[role=menu]")) return
    const key = event.key.toLowerCase()
    if (key === "k" || (key === " " && (isRange || target === event.currentTarget))) {
      event.preventDefault()
      toggle()
    } else if (key === "j" || (isRange && event.key === "ArrowLeft")) {
      event.preventDefault()
      skip(-SKIP_SECONDS)
    } else if (key === "l" || (isRange && event.key === "ArrowRight")) {
      event.preventDefault()
      skip(SKIP_SECONDS)
    }
  }

  const fraction = total > 0 ? time / total : 0
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const disabled = total <= 0

  return (
    <div
      role="region"
      aria-label={label}
      aria-keyshortcuts="k j l Space"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn("space-y-2 outline-none", className)}
    >
      {audioUrl && !audioFailed ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration
            if (Number.isFinite(d) && d > 0) setMediaDuration(d)
          }}
          onPause={() => {
            if (playing) applyPlaying(false)
          }}
          onError={() => setAudioFailed(true)}
          className="hidden"
        />
      ) : null}

      {/* Scrubber: a native range input (keyboard + screen readers) over a transform-only visual. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <span className="w-12 font-mono text-xs text-muted-foreground tabular-nums">{formatTimestamp(time)}</span>
        <div className="group/scrub relative h-5 rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full w-full origin-left bg-primary"
              style={{ transform: `scaleX(${fraction})` }}
            />
          </div>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-full"
            style={{ transform: `translateX(${fraction * 100}%)` }}
          >
            <span className="absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary transition-transform group-hover/scrub:scale-125" />
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(total, 0.001)}
            step={1}
            value={time}
            disabled={disabled}
            onChange={(e) => seek(Number(e.currentTarget.value))}
            aria-label="Seek"
            aria-valuetext={`${formatTimestamp(time)} of ${formatTimestamp(total)}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </div>
        <span className="w-12 text-right font-mono text-xs text-muted-foreground tabular-nums">
          {formatTimestamp(total)}
        </span>
      </div>

      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => skip(-SKIP_SECONDS)}
            disabled={disabled}
            aria-label="Back 5 seconds"
            title="Back 5 seconds (J)"
          >
            <RotateCcw aria-hidden />
          </Button>
          <Button
            size="icon"
            onClick={toggle}
            disabled={disabled}
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            title={playing ? "Pause (K)" : "Play (K)"}
            className="rounded-full"
          >
            {playing ? <Pause aria-hidden /> : <Play aria-hidden className="translate-x-px" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => skip(SKIP_SECONDS)}
            disabled={disabled}
            aria-label="Forward 5 seconds"
            title="Forward 5 seconds (L)"
          >
            <RotateCw aria-hidden />
          </Button>
        </div>

        <p className="min-w-0 truncate px-1 text-xs text-muted-foreground" aria-live="off">
          {active ? (
            <>
              <span className="font-medium text-foreground">{active.speakerName}</span>
              <span className="hidden sm:inline"> · {active.text}</span>
            </>
          ) : simulated ? (
            "No recording attached. Playback follows the transcript."
          ) : null}
        </p>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={`Playback speed ${rateLabel(rate)}`} className="font-mono tabular-nums">
                {rateLabel(rate)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuLabel>Speed</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={String(rate)}
                onValueChange={(v) => setStoredRate(Number(v) as PlaybackRate)}
              >
                {PLAYBACK_RATES.map((r) => (
                  <DropdownMenuRadioItem key={r} value={String(r)} className="font-mono tabular-nums">
                    {rateLabel(r)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (muted || volume === 0) {
                setMuted(false)
                if (volume === 0) setStoredVolume(1)
              } else {
                setMuted(true)
              }
            }}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
          >
            <VolumeIcon aria-hidden />
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setMuted(false)
              setStoredVolume(Number(e.currentTarget.value))
            }}
            aria-label="Volume"
            aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
            className="hidden h-1 w-20 cursor-pointer accent-primary sm:block"
          />
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer
