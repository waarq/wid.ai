"use client"

import { Columns3, Handshake, List, Plus, Search, X } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { UrlFilterChips } from "@/components/shared/url-filter-chips"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebouncedValue, useDeals } from "@/hooks"
import { cn } from "@/lib/utils"
import { usePreferencesStore, type DealsView } from "@/store/preferences-store"
import { useStoreHydration } from "@/store/hydration"
import { DEAL_STAGES, type Deal, type DealStage } from "@/types"

import { CreateDealDialog } from "./create-deal-dialog"
import { DealCard } from "./deal-card"
import { STAGE_FILTER_OPTIONS, STAGE_LABEL } from "./deal-meta"
import { DealsSkeleton } from "./deals-skeleton"

const SEARCH_DEBOUNCE_MS = 300

function ViewToggle({ view, onChange }: { view: DealsView; onChange: (view: DealsView) => void }) {
  const options = [
    { value: "list", label: "List view", icon: List },
    { value: "board", label: "Board view", icon: Columns3 },
  ] as const
  return (
    <div role="group" aria-label="Deals view" className="hidden rounded-lg border border-border p-0.5 lg:inline-flex">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          aria-label={label}
          onClick={() => onChange(value)}
          className={cn(
            "grid size-7 place-items-center rounded-md outline-none transition-colors active:scale-95",
            "focus-visible:ring-2 focus-visible:ring-ring",
            view === value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  )
}

function useSearchParamSync(value: string, urlValue: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    const next = value.trim()
    if (next === urlValue) return
    const params = new URLSearchParams(searchParams.toString())
    if (next) params.set("q", next)
    else params.delete("q")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    // Only the debounced value should drive URL writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
}

export function DealsView({ stage, query }: { stage: DealStage | undefined; query: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hydrated = useStoreHydration(usePreferencesStore)
  const storedView = usePreferencesStore((s) => s.dealsView)
  const setView = usePreferencesStore((s) => s.setDealsView)
  const view: DealsView = hydrated ? storedView : "list"

  const [text, setText] = useState(query)
  const debounced = useDebouncedValue(text, SEARCH_DEBOUNCE_MS)
  useSearchParamSync(debounced, query)

  const deals = useDeals({ stage, search: debounced.trim() || undefined, limit: 100 })
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = Boolean(stage) || debounced.trim().length > 0

  function clearFilters() {
    setText("")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("stage")
    params.delete("q")
    const q = params.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search company or deal"
            aria-label="Search deals"
            className="h-9 pr-8 pl-8"
          />
          {text ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setText("")
                inputRef.current?.focus()
              }}
              className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <UrlFilterChips param="stage" options={STAGE_FILTER_OPTIONS} value={stage ?? "all"} label="Filter deals by stage" defaultValue="all" />
      </div>

      {deals.isPending ? (
        <DealsSkeleton />
      ) : deals.isError ? (
        <ErrorState
          title="We couldn't load your deals."
          description="Your deals haven't changed. Try again in a moment."
          onRetry={() => void deals.refetch()}
          retrying={deals.isRefetching}
        />
      ) : deals.data.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={Search}
            title="No deals match."
            description="Try another stage or a different search."
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Handshake}
            title="No deals yet."
            description="Deals are built from your customer conversations. Create one, then link the meetings behind it."
            action={
              <CreateDealDialog
                trigger={
                  <Button>
                    <Plus aria-hidden /> New deal
                  </Button>
                }
              />
            }
          />
        )
      ) : (
        <DealCollection deals={deals.data.items} view={view} stage={stage} stale={deals.isPlaceholderData} />
      )}
    </div>
  )
}

function DealCollection({ deals, view, stage, stale }: { deals: Deal[]; view: DealsView; stage: DealStage | undefined; stale: boolean }) {
  const stages = stage ? [stage] : DEAL_STAGES
  const groups = stages.map((s) => ({ stage: s, deals: deals.filter((d) => d.stage === s) }))
  const populated = groups.filter((g) => g.deals.length > 0)

  const list = (
    <div className={cn("space-y-6", view === "board" && "lg:hidden")}>
      {populated.map((group) => (
        <section key={group.stage} aria-labelledby={`stage-${group.stage}`} className="space-y-2">
          <h2 id={`stage-${group.stage}`} className="flex items-center gap-2 text-[13px] font-medium text-foreground">
            {STAGE_LABEL[group.stage]}
            <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">{group.deals.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} showStage={false} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )

  return (
    <div className={cn("transition-opacity", stale && "opacity-60")} aria-busy={stale}>
      {list}
      {view === "board" ? (
        <div className="hidden gap-3 overflow-x-auto pb-2 lg:flex">
          {groups.map((group) => (
            <section
              key={group.stage}
              aria-labelledby={`board-${group.stage}`}
              className="grid min-w-64 flex-1 basis-64 content-start gap-2"
            >
              <h2 id={`board-${group.stage}`} className="flex items-center gap-2 border-b border-border pb-2 text-[13px] font-medium">
                {STAGE_LABEL[group.stage]}
                <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">{group.deals.length}</span>
              </h2>
              {group.deals.length === 0 ? (
                <p className="py-3 text-xs text-muted-foreground">No deals in this stage.</p>
              ) : (
                group.deals.map((deal) => <DealCard key={deal.id} deal={deal} showStage={false} />)
              )}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  )
}
