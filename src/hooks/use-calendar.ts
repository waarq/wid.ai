"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { CalendarConnection, CalendarEvent, CalendarEventParams } from "@/types"

function invalidateCalendarDependents(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all })
}

/** Google Calendar connection status ("disconnected" is a normal value, not an error). */
export function useCalendar() {
  return useQuery<CalendarConnection>({
    queryKey: queryKeys.calendar.connection(),
    queryFn: () => services.calendar.getConnection(),
  })
}

export function useCalendarEvents(params: CalendarEventParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery<CalendarEvent[]>({
    queryKey: queryKeys.calendar.events(params),
    queryFn: () => services.calendar.listEvents(params),
    enabled: options.enabled ?? true,
  })
}

/**
 * Connects Google Calendar. If the result carries `authorizationUrl`
 * (redirect-based OAuth), the UI should navigate there.
 */
export function useConnectCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => services.calendar.connect(),
    onSuccess: (connection) => {
      queryClient.setQueryData(queryKeys.calendar.connection(), connection)
      invalidateCalendarDependents(queryClient)
    },
  })
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => services.calendar.disconnect(),
    onSuccess: () => invalidateCalendarDependents(queryClient),
  })
}
