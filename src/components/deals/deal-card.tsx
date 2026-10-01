import Link from "next/link"
import { ArrowRight, CalendarClock } from "lucide-react"

import { formatDay } from "@/components/calls/format"
import { cn } from "@/lib/utils"
import type { Deal } from "@/types"

import { formatDue, formatMoney } from "./deal-meta"
import { SignalChips } from "./signal-chip"
import { StageBadge } from "./stage-badge"

/**
 * One deal. The whole card is the link (stretched via the company title), so
 * the signal chips stay readable text and nothing nests interactive elements.
 */
export function DealCard({ deal, showStage = true, className }: { deal: Deal; showStage?: boolean; className?: string }) {
  return (
    <article
      className={cn(
        "relative grid min-w-0 gap-3 rounded-lg border border-border bg-card p-4 transition-colors",
        "hover:border-border-strong active:scale-[0.99] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring",
        className,
      )}
    >
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">
            <Link href={`/deals/${deal.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
              {deal.company}
            </Link>
          </h3>
          <p className="font-mono text-sm text-foreground tabular-nums">{formatMoney(deal.value)}</p>
        </div>
        {showStage ? <StageBadge stage={deal.stage} /> : null}
      </div>

      <dl className="grid gap-1.5 text-xs text-muted-foreground">
        <div className="flex gap-1.5">
          <dt className="shrink-0">Last meeting</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {deal.lastMeetingAt ? formatDay(deal.lastMeetingAt) : "None yet"}
          </dd>
        </div>
        <div className="flex items-start gap-1.5">
          <dt className="shrink-0">Next action</dt>
          <dd className="min-w-0 text-foreground">
            {deal.nextAction ? (
              <>
                <span className="inline-flex items-start gap-1">
                  <ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span>{deal.nextAction.title}</span>
                </span>
                {deal.nextAction.dueDate ? (
                  <span className="ml-1 inline-flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
                    <CalendarClock className="size-3" aria-hidden />
                    {formatDue(deal.nextAction.dueDate)}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">Not set</span>
            )}
          </dd>
        </div>
      </dl>

      <SignalChips signals={deal.signals} />
    </article>
  )
}
