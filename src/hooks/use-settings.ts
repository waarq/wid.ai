"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { AppError, Settings, UpdateSettingsInput } from "@/types"

import { updateEntity, type OptimisticContext } from "./cache-utils"

export function useSettings() {
  return useQuery<Settings>({
    queryKey: queryKeys.settings.detail(),
    queryFn: () => services.settings.get(),
  })
}

/**
 * Patches one section. Applied optimistically (switches feel instant) and
 * rolled back on failure. Saving "general" also refreshes the profile.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation<Settings, AppError, UpdateSettingsInput, OptimisticContext>({
    mutationFn: (input) => services.settings.update(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.all })
      const rollback = updateEntity<Settings>(queryClient, queryKeys.settings.detail(), (settings) => {
        const section = settings[input.section]
        const patch = input.patch as Record<string, unknown>
        const merged: Record<string, unknown> = { ...section, ...patch }
        if (input.section === "notifications" && input.patch.channels) {
          merged.channels = { ...settings.notifications.channels, ...input.patch.channels }
        }
        return { ...settings, [input.section]: merged } as Settings
      })
      return { rollback }
    },
    onError: (_error, _input, context) => context?.rollback(),
    onSuccess: (settings, input) => {
      queryClient.setQueryData(queryKeys.settings.detail(), settings)
      if (input.section === "general") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
      }
      if (input.section === "ai") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.assistant.all })
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all }),
  })
}

/** Signs out another device listed under Security. */
export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => services.settings.revokeSession(sessionId),
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.settings.detail(), settings),
  })
}
