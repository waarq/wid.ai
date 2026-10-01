"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { AuthSession, OnboardingData, OnboardingProgress, SaveOnboardingStepInput } from "@/types"

/** Server-side onboarding progress (refresh / cross-device recovery). */
export function useOnboardingProgress(options: { enabled?: boolean } = {}) {
  return useQuery<OnboardingProgress>({
    queryKey: queryKeys.onboarding.progress(),
    queryFn: () => services.onboarding.getProgress(),
    enabled: options.enabled ?? true,
  })
}

export function useSaveOnboardingStep() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SaveOnboardingStepInput) => services.onboarding.saveStep(input),
    onSuccess: (progress) => queryClient.setQueryData(queryKeys.onboarding.progress(), progress),
  })
}

/**
 * Submits the full payload. On success the session stage becomes "ready";
 * the UI then navigates to /my-calls (or the Zoom step, if shown after).
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: OnboardingData) => services.onboarding.complete(data),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.user.profile(), user)
      queryClient.setQueryData<AuthSession | null>(queryKeys.auth.session(), (session) =>
        session ? { ...session, user, stage: "ready" } : session,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all })
    },
  })
}
