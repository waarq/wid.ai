"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LayoutGrid, List, Search, X } from "lucide-react"

import { UrlFilterChips } from "@/components/shared/url-filter-chips"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CollectionView } from "@/store/preferences-store"
import { cn } from "@/lib/utils"

import { useCollectionView } from "./use-collection-view"
import { MY_CALLS_RANGES, STATUS_FILTERS, type MyCallsFilters } from "./filters"

const SEARCH_DEBOUNCE_MS = 300

function useUrlParamSetter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }
}

export function ViewToggle({ view, onChange }: { view: CollectionView; onChange: (view: CollectionView) => void }) {
  const options = [
    { value: "list", label: "List view", icon: List },
    { value: "grid", label: "Grid view", icon: LayoutGrid },
  ] as const
  return (
    <div role="group" aria-label="View" className="inline-flex rounded-lg border border-border p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={view === value}
          onClick={() => onChange(value)}
          className={cn(
            "grid size-6 place-items-center rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
            view === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  )
}

/** All My Calls filters. State lives in the URL: ?range=&status=&q= */
export function MeetingFilters({ filters }: { filters: MyCallsFilters }) {
  const setParam = useUrlParamSetter()
  const [view, setView] = useCollectionView("meetings")
  const [query, setQuery] = useState(filters.q)
  const [lastPushed, setLastPushed] = useState(filters.q)
  const [seenUrlQ, setSeenUrlQ] = useState(filters.q)

  // External URL change (back button, "Clear filters"): adopt it. Echoes of our own writes are ignored.
  if (filters.q !== seenUrlQ) {
    setSeenUrlQ(filters.q)
    if (filters.q !== lastPushed) {
      setQuery(filters.q)
      setLastPushed(filters.q)
    }
  }

  // Debounced URL write.
  useEffect(() => {
    if (query === lastPushed) return
    const id = window.setTimeout(() => {
      setLastPushed(query)
      setParam("q", query.trim() || null)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, lastPushed])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[minmax(0,20rem)_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meetings..."
            aria-label="Search meetings"
            className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Clear search"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => setQuery("")}
            >
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
        <span className="hidden sm:block" />
        <ViewToggle view={view} onChange={setView} />
      </div>

      <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto]">
        <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <UrlFilterChips param="range" options={MY_CALLS_RANGES} value={filters.range} label="Date range" />
        </div>
        <Select value={filters.status} onValueChange={(v) => setParam("status", v === "all" ? null : v)}>
          <SelectTrigger size="sm" aria-label="Filter by status" className="w-32 sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
