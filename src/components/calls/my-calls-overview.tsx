"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { useMeetings, useProfile } from "@/hooks"
import { cn } from "@/lib/utils"

import { buildAttentionTiles, greetingFor, type AttentionTotals } from "./attention"
import { GreetingSkeleton } from "./calls-skeleton"

const RECENT_WINDOW_DAYS = 7

/** Greeting + "what needs your attention" strip, derived from the meetings hook. */
export function MyCallsOverview() {
  const profile = useProfile()
  const meetings = useMeetings({ scope: "my_calls", status: "ready", sort: "recent", limit: 50 })

  const [now] = useState(() => Date.now())
  const totals = useMemo<AttentionTotals>(() => {
    const cutoff = now - RECENT_WINDOW_DAYS * 86_400_000
    const sum: AttentionTotals = { actionItems: 0, decisions: 0, openQuestions: 0, risks: 0 }
    for (const m of meetings.data?.items ?? []) {
      if (!m.stats || new Date(m.startedAt).getTime() < cutoff) continue
      sum.actionItems += m.stats.actionItems
      sum.decisions += m.stats.decisions
      sum.openQuestions += m.stats.openQuestions
      sum.risks += m.stats.risks
    }
    return sum
  }, [meetings.data, now])

  if (profile.isPending || meetings.isPending) return <GreetingSkeleton />
  // The overview is secondary: if it can't load, the library below still works.
  if (profile.isError || meetings.isError || !profile.data) return null

  const tiles = buildAttentionTiles(profile.data.jobFunction, totals)
  const recent = (meetings.data?.items ?? []).slice(0, 3)
  const hasAnything = tiles.some((t) => t.count > 0)

  return (
    <section aria-labelledby="greeting" className="space-y-3">
      <div className="space-y-0.5">
        <h2 id="greeting" className="text-base font-semibold tracking-tight">
          {greetingFor(new Date())}, {profile.data.firstName}.
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasAnything ? "Here's what needs your attention." : "You're up to date. Nothing needs your attention."}
        </p>
      </div>
      {hasAnything ? (
        <dl className="grid grid-cols-3 divide-x divide-border border-y border-border">
          {tiles.map((tile, i) => (
            <div key={tile.key} className={cn("flex flex-col-reverse px-3 py-2.5", i === 0 && "pl-0")}>
              <dt className="truncate text-xs text-muted-foreground">
                {tile.count === 1 ? tile.singular : tile.plural}
              </dt>
              <dd className="font-mono text-xl font-medium tabular-nums">{tile.count}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {recent.length > 0 ? (
        <p className="truncate text-xs text-muted-foreground">
          Recent:{" "}
          {recent.map((m, i) => (
            <span key={m.id}>
              {i > 0 ? " · " : ""}
              <Link href={`/my-calls/${m.id}`} className="rounded-sm underline-offset-2 hover:text-foreground hover:underline">
                {m.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  )
}
