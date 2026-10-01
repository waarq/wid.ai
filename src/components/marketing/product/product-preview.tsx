import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { getBriefData, getLaunchExchange } from "../data"
import { ActionLine, FieldLabel, MiniTimeline, StatRow } from "./preview-parts"

/** The hero product mock-up: the Product Planning brief, built from the shared fixtures. */
export function ProductPreview() {
  const brief = getBriefData()
  const exchange = getLaunchExchange()

  return (
    <figure aria-label={`Product preview: ${brief.title} meeting brief`} className="relative">
      <div className="rounded-xl border border-border bg-card p-5 shadow-float sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight">{brief.title}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {brief.when} · {brief.minutes} min · {brief.participants} participants
            </p>
          </div>
          <StatusBadge status="ready" />
        </div>

        <div className="mt-5">
          <StatRow stats={brief.stats} />
        </div>

        <div className="mt-4">
          <MiniTimeline moments={brief.moments} durationLabel={brief.durationLabel} />
        </div>

        <div className="mt-5">
          <FieldLabel>Meeting brief</FieldLabel>
          <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">{brief.overview}</p>
        </div>

        <div className="mt-5">
          <FieldLabel>Your actions</FieldLabel>
          <ul className="divide-y divide-border">
            {brief.yourActions.map((row) => (
              <ActionLine key={row.id} row={row} />
            ))}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="font-mono text-[11px] text-muted-foreground">Demo data</p>
          <Button asChild size="lg">
            <Link href="/register">
              Open meeting
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-popover p-4 shadow-float sm:ml-10 lg:absolute lg:-bottom-60 lg:-left-20 lg:mt-0 lg:ml-0 lg:w-[19.5rem]">
        <FieldLabel className="mb-3">Transcript</FieldLabel>
        <ol className="space-y-2.5">
          {exchange.lines.map((line) => (
            <li key={line.id} className="grid grid-cols-[3rem_1fr] gap-x-2 text-[13px] leading-snug">
              <span className="font-mono text-xs text-muted-foreground">{line.time}</span>
              <span>
                <span className="font-medium">{line.speaker}</span>
                <span className="text-muted-foreground"> {line.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 border-t border-border pt-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-primary-ink">Decision</span> {exchange.decision}{" "}
          <span className="font-mono">{exchange.source}</span>
        </p>
      </div>
    </figure>
  )
}
