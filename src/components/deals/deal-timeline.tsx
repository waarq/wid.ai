import Link from "next/link"

import { formatDayTime, formatTimestamp } from "@/components/calls/format"
import type { Deal } from "@/types"

import { SignalChip } from "./signal-chip"
import { sourceHref } from "./deal-meta"

/** Meeting-driven history: each linked meeting with the signals it produced, then creation. */
export function DealTimeline({ deal }: { deal: Deal }) {
  const meetings = [...deal.meetings].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))

  return (
    <ol className="relative grid gap-5 border-l border-border pl-5" aria-label="Deal timeline">
      {meetings.map((meeting) => {
        const signals = deal.signals.filter((s) => s.meetingId === meeting.id)
        return (
          <li key={meeting.id} className="relative grid gap-2">
            <span aria-hidden className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-primary" />
            <div className="grid gap-0.5">
              <p className="font-mono text-xs text-muted-foreground tabular-nums">{formatDayTime(meeting.startedAt)}</p>
              <Link
                href={`/my-calls/${meeting.id}`}
                className="w-fit rounded-sm text-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {meeting.title}
              </Link>
            </div>
            {signals.length > 0 ? (
              <ul className="grid gap-1.5">
                {signals.map((signal) => (
                  <li key={signal.id} className="flex flex-wrap items-center gap-2">
                    <SignalChip signal={signal} />
                    <Link
                      href={sourceHref(signal)}
                      className="rounded-sm font-mono text-xs text-muted-foreground tabular-nums underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Jump to ${formatTimestamp(signal.sourceTimestamp)} in ${meeting.title}`}
                    >
                      {formatTimestamp(signal.sourceTimestamp)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No signals detected in this meeting.</p>
            )}
          </li>
        )
      })}
      <li className="relative grid gap-0.5">
        <span aria-hidden className="absolute top-1.5 -left-[25px] size-2 rounded-full bg-border-strong" />
        <p className="font-mono text-xs text-muted-foreground tabular-nums">{formatDayTime(deal.createdAt)}</p>
        <p className="text-sm text-foreground">Deal created</p>
      </li>
    </ol>
  )
}
