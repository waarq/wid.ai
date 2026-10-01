"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { Alert, AlertListParams, AppError, ListResponse } from "@/types"

import { combineRollbacks, updateEntity, updateListItems, type OptimisticContext } from "./cache-utils"

/** Background refresh for the notification badge. */
const UNREAD_POLL_MS = 60_000

/** Feeds both the /alerts page and the topbar notification menu. */
export function useAlerts(params: AlertListParams = {}) {
  return useQuery<ListResponse<Alert>>({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => services.alerts.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useUnreadAlertCount() {
  return useQuery<number>({
    queryKey: queryKeys.alerts.unreadCount(),
    queryFn: () => services.alerts.getUnreadCount(),
    refetchInterval: UNREAD_POLL_MS,
  })
}

async function cancelAlerts(queryClient: QueryClient): Promise<void> {
  await queryClient.cancelQueries({ queryKey: queryKeys.alerts.all })
}

function settleAlerts(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient()
  return useMutation<Alert, AppError, string, OptimisticContext>({
    mutationFn: (alertId) => services.alerts.markRead(alertId),
    onMutate: async (alertId) => {
      await cancelAlerts(queryClient)
      const readAt = new Date().toISOString()
      let wasUnread = false
      const listRollback = updateListItems<Alert>(queryClient, queryKeys.alerts.lists(), (alert) => {
        if (alert.id !== alertId || alert.readAt) return alert
        wasUnread = true
        return { ...alert, readAt }
      })
      const countRollback = updateEntity<number>(queryClient, queryKeys.alerts.unreadCount(), (count) =>
        wasUnread ? Math.max(0, count - 1) : count,
      )
      return { rollback: combineRollbacks([listRollback, countRollback]) }
    },
    onError: (_error, _id, context) => context?.rollback(),
    onSettled: () => settleAlerts(queryClient),
  })
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, void, OptimisticContext>({
    mutationFn: () => services.alerts.markAllRead(),
    onMutate: async () => {
      await cancelAlerts(queryClient)
      const readAt = new Date().toISOString()
      const listRollback = updateListItems<Alert>(queryClient, queryKeys.alerts.lists(), (alert) =>
        alert.readAt ? alert : { ...alert, readAt },
      )
      const countRollback = updateEntity<number>(queryClient, queryKeys.alerts.unreadCount(), () => 0)
      return { rollback: combineRollbacks([listRollback, countRollback]) }
    },
    onError: (_error, _vars, context) => context?.rollback(),
    onSettled: () => settleAlerts(queryClient),
  })
}

export function useDismissAlert() {
  const queryClient = useQueryClient()
  return useMutation<void, AppError, string, OptimisticContext>({
    mutationFn: (alertId) => services.alerts.dismiss(alertId),
    onMutate: async (alertId) => {
      await cancelAlerts(queryClient)
      let wasUnread = false
      const listRollback = updateListItems<Alert>(queryClient, queryKeys.alerts.lists(), (alert) => {
        if (alert.id !== alertId) return alert
        if (!alert.readAt) wasUnread = true
        return null
      })
      const countRollback = updateEntity<number>(queryClient, queryKeys.alerts.unreadCount(), (count) =>
        wasUnread ? Math.max(0, count - 1) : count,
      )
      return { rollback: combineRollbacks([listRollback, countRollback]) }
    },
    onError: (_error, _id, context) => context?.rollback(),
    onSettled: () => settleAlerts(queryClient),
  })
}
