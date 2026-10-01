"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { SearchParams, SearchResult, SearchResultType } from "@/types"

/** Minimum characters before global search runs. */
export const SEARCH_MIN_LENGTH = 2

/** Debounces a fast-changing value (search inputs). */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/**
 * Global search. Pass the debounced query (see useDebouncedValue). Results
 * arrive ranked; group them with `groupSearchResults`.
 */
export function useSearch(query: string, params: SearchParams = {}, options: { enabled?: boolean } = {}) {
  const trimmed = query.trim()
  return useQuery<SearchResult[]>({
    queryKey: queryKeys.search.results(trimmed, params),
    queryFn: () => services.search.search(trimmed, params),
    enabled: trimmed.length >= SEARCH_MIN_LENGTH && (options.enabled ?? true),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export type GroupedSearchResults = { [T in SearchResultType]: Extract<SearchResult, { type: T }>[] }

/** Display order for the command palette groups (PRD: Meetings, Actions, Deals, People, Commands). */
export const SEARCH_GROUP_ORDER: readonly SearchResultType[] = [
  "meeting",
  "decision",
  "action",
  "transcript",
  "deal",
  "person",
  "command",
]

/** Buckets ranked results by type, keeping rank order inside each group. */
export function groupSearchResults(results: readonly SearchResult[]): GroupedSearchResults {
  const groups: GroupedSearchResults = {
    meeting: [],
    transcript: [],
    action: [],
    decision: [],
    deal: [],
    person: [],
    command: [],
  }
  for (const result of results) {
    ;(groups[result.type] as SearchResult[]).push(result)
  }
  return groups
}
