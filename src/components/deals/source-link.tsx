import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import { formatTimestamp } from "@/components/calls/format"
import type { Traceable } from "@/types"

import { sourceHref } from "./deal-meta"

/** "Source: <meeting> · mm:ss · Jump to conversation". Every insight links back to its evidence. */
export function SourceLink({ source, meetingTitle }: { source: Traceable; meetingTitle?: string }) {
  const stamp = formatTimestamp(source.sourceTimestamp)
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <span>Source: {meetingTitle ?? "Meeting"}</span>
      <span aria-hidden>·</span>
      <span className="font-mono tabular-nums">{stamp}</span>
      <span aria-hidden>·</span>
      <Link
        href={sourceHref(source)}
        className="inline-flex items-center gap-0.5 rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Jump to conversation at ${stamp} in ${meetingTitle ?? "the meeting"}`}
      >
        Jump to conversation
        <ArrowUpRight className="size-3" aria-hidden />
      </Link>
    </p>
  )
}
