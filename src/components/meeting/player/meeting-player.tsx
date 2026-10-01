"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"
import type { TranscriptSegment } from "@/types"

import { usePlayback } from "../playback-context"

/**
 * The reusable AudioPlayer, code-split and client-only (conventions section 3).
 * Use this anywhere a player is needed; it does not depend on the meeting page.
 */
export const LazyAudioPlayer = dynamic(() => import("./audio-player").then((m) => m.AudioPlayer), {
  ssr: false,
  loading: () => <PlayerSkeleton />,
})

export function PlayerSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-3 py-1">
      <span className="sr-only">Loading player</span>
      <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-1 w-full" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="size-7 rounded-md" />
        <Skeleton className="ml-auto h-6 w-24" />
      </div>
    </div>
  )
}

/** The page's player, wired to the shared jump-to-source store. */
export function MeetingPlayer({
  audioUrl,
  duration,
  segments,
  className,
}: {
  audioUrl?: string
  duration: number
  segments: TranscriptSegment[]
  className?: string
}) {
  const command = usePlayback((s) => s.command)
  const report = usePlayback((s) => s.report)
  const setPlaying = usePlayback((s) => s.setPlaying)
  return (
    <LazyAudioPlayer
      audioUrl={audioUrl}
      duration={duration}
      segments={segments}
      command={command}
      onTimeUpdate={(time, segment) => report(time, segment?.id)}
      onPlayingChange={setPlaying}
      className={className}
    />
  )
}
