"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { Integration, IntegrationOf, IntegrationProvider, IntegrationSettingsMap } from "@/types"

function settleIntegration(queryClient: QueryClient, integration: Integration): void {
  queryClient.setQueryData(queryKeys.integrations.detail(integration.provider), integration)
  queryClient.setQueryData<Integration[]>(queryKeys.integrations.list(), (list) =>
    list?.map((item) => (item.provider === integration.provider ? integration : item)),
  )
  void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all })
  // Calendar connection and onboarding progress are derived from integrations.
  if (integration.provider === "google_calendar") {
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all })
}

/** Every provider in display order, including "coming_soon" ones. */
export function useIntegrations() {
  return useQuery<Integration[]>({
    queryKey: queryKeys.integrations.list(),
    queryFn: () => services.integrations.list(),
  })
}

export function useIntegration<P extends IntegrationProvider>(provider: P) {
  return useQuery<IntegrationOf<P>>({
    queryKey: queryKeys.integrations.detail(provider),
    queryFn: () => services.integrations.get(provider),
  })
}

/**
 * Connects a provider. If the result has `authorizationUrl` (redirect OAuth),
 * the UI navigates there; the mock resolves connected immediately.
 */
export function useConnectIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: IntegrationProvider): Promise<Integration> =>
      services.integrations.connect(provider) as Promise<Integration>,
    onSuccess: (integration) => settleIntegration(queryClient, integration),
  })
}

/** Convenience for the post-onboarding "Connect Zoom" step. */
export function useConnectZoom() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => services.integrations.connect("zoom"),
    onSuccess: (integration) => settleIntegration(queryClient, integration),
  })
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: IntegrationProvider): Promise<Integration> =>
      services.integrations.disconnect(provider) as Promise<Integration>,
    onSuccess: (integration) => settleIntegration(queryClient, integration),
  })
}

export function useConfigureIntegration<P extends IntegrationProvider>(provider: P) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: Partial<IntegrationSettingsMap[P]>) => services.integrations.configure(provider, settings),
    onSuccess: (integration) => settleIntegration(queryClient, integration as Integration),
  })
}
