"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import { useCaptureStore } from "@/store/capture-store"
import { useOnboardingStore } from "@/store/onboarding-store"
import type { AuthResult, AuthSession, GoogleAccountOption, GoogleSignInInput } from "@/types"

/** Current session (null when signed out). `session.stage` drives routing. */
export function useSession() {
  return useQuery<AuthSession | null>({
    queryKey: queryKeys.auth.session(),
    queryFn: () => services.auth.getSession(),
    staleTime: 5 * 60_000,
  })
}

/** Accounts for the WIT Google account chooser. May be [] for real OAuth. */
export function useGoogleAccounts(options: { enabled?: boolean } = {}) {
  return useQuery<GoogleAccountOption[]>({
    queryKey: queryKeys.auth.googleAccounts(),
    queryFn: () => services.auth.listGoogleAccounts(),
    staleTime: Infinity,
    enabled: options.enabled ?? true,
  })
}

/**
 * "Continue with Google". On success the session is cached and the UI routes
 * with `getPostAuthPath(result.session.stage, next)` from "@/lib/auth".
 */
export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input?: GoogleSignInInput): Promise<AuthResult> => services.auth.signInWithGoogle(input),
    onSuccess: (result) => {
      // Another account may have been signed in on this tab: drop its data.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.auth.all[0] })
      queryClient.setQueryData(queryKeys.auth.session(), result.session)
      queryClient.setQueryData(queryKeys.user.profile(), result.session.user)
      if (result.isNewUser) useOnboardingStore.getState().reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
    },
  })
}

/** Signs out and drops every cached query and client draft for this account. */
export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => services.auth.signOut(),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(queryKeys.auth.session(), null)
      useOnboardingStore.getState().reset()
      useCaptureStore.getState().reset()
    },
  })
}
