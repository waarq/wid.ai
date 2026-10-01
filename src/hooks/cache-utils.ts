import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type { ListResponse } from "@/types"

/*
 * Small helpers for optimistic updates over every cached page of a list.
 * Each returns a rollback function that restores exactly what was replaced.
 */

export type Rollback = () => void

type Snapshot = Array<[QueryKey, unknown]>

function restore(queryClient: QueryClient, snapshot: Snapshot): Rollback {
  return () => {
    for (const [key, data] of snapshot) queryClient.setQueryData(key, data)
  }
}

/**
 * Applies `update` to each item of every cached `ListResponse` under `prefix`.
 * Return `null` from `update` to remove the item.
 */
export function updateListItems<T>(
  queryClient: QueryClient,
  prefix: QueryKey,
  update: (item: T) => T | null,
): Rollback {
  const snapshot = queryClient.getQueriesData<ListResponse<T>>({ queryKey: prefix })
  for (const [key, data] of snapshot) {
    if (!data || !Array.isArray(data.items)) continue
    let removed = 0
    const items: T[] = []
    for (const item of data.items) {
      const next = update(item)
      if (next === null) removed += 1
      else items.push(next)
    }
    queryClient.setQueryData<ListResponse<T>>(key, { ...data, items, total: Math.max(0, data.total - removed) })
  }
  return restore(queryClient, snapshot)
}

/** Prepends an item to every cached first page under `prefix`. */
export function prependListItem<T>(queryClient: QueryClient, prefix: QueryKey, item: T): Rollback {
  const snapshot = queryClient.getQueriesData<ListResponse<T>>({ queryKey: prefix })
  for (const [key, data] of snapshot) {
    if (!data || !Array.isArray(data.items)) continue
    queryClient.setQueryData<ListResponse<T>>(key, { ...data, items: [item, ...data.items], total: data.total + 1 })
  }
  return restore(queryClient, snapshot)
}

/** Updates one cached entity, if present. */
export function updateEntity<T>(queryClient: QueryClient, key: QueryKey, update: (value: T) => T): Rollback {
  const previous = queryClient.getQueryData<T>(key)
  if (previous !== undefined) queryClient.setQueryData<T>(key, update(previous))
  return () => queryClient.setQueryData(key, previous)
}

export function combineRollbacks(rollbacks: Rollback[]): Rollback {
  return () => {
    for (const rollback of [...rollbacks].reverse()) rollback()
  }
}

/** Mutation context carrying the rollback for onError. */
export interface OptimisticContext {
  rollback: Rollback
}
