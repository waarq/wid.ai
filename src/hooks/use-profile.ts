"use client"

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query"
import { services } from "@/services"
import type { AuthSession, UpdateProfileInput, User } from "@/types"

function syncUser(queryClient: QueryClient, user: User): void {
  queryClient.setQueryData(queryKeys.user.profile(), user)
  queryClient.setQueryData<AuthSession | null>(queryKeys.auth.session(), (session) =>
    session ? { ...session, user } : session,
  )
  // Settings.general mirrors the profile.
  void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.user.members() })
}

export function useProfile(options: { enabled?: boolean } = {}) {
  return useQuery<User>({
    queryKey: queryKeys.user.profile(),
    queryFn: () => services.user.getProfile(),
    enabled: options.enabled ?? true,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => services.user.updateProfile(input),
    onSuccess: (user) => syncUser(queryClient, user),
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: Blob) => services.user.uploadAvatar(file),
    onSuccess: (user) => syncUser(queryClient, user),
  })
}

/** Teammates for Team Calls filters, share pickers and assignees. */
export function useWorkspaceMembers() {
  return useQuery({
    queryKey: queryKeys.user.members(),
    queryFn: () => services.user.listWorkspaceMembers(),
    staleTime: 5 * 60_000,
  })
}
