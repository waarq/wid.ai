import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { getSearchDemoData } from "../data"
import { Eyebrow } from "../layout/section"

/** Static search mock-up. Results are real transcript segments from the fixtures. */
export function SearchMemory({ compact = false }: { compact?: boolean }) {
  const { query, hits } = getSearchDemoData()
  const shown = compact ? hits.slice(0, 1) : hits
  return (
    <figure aria-label="Search results across meetings" className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2">
        <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 truncate text-sm">{query}</p>
      </div>
      <ul className="mt-2 divide-y divide-border">
        {shown.map((hit) => (
          <li key={hit.id} className="py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">{hit.meetingTitle}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {hit.date} · {hit.time}
              </p>
            </div>
            <blockquote className={cn("mt-2 text-sm leading-relaxed", compact ? "line-clamp-3" : "")}>
              <span className="text-muted-foreground">{hit.speaker}: </span>
              &ldquo;{hit.quote}&rdquo;
            </blockquote>
            <Eyebrow className="mt-3 text-primary-ink">Jump to moment {hit.time}</Eyebrow>
          </li>
        ))}
      </ul>
    </figure>
  )
}
