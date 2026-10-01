"use client"

import { useEffect, useState, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { queryKeys } from "@/lib/query"
import { makeQueryClient } from "@/lib/query/client"
import { installSupabaseTokenProvider, onSupabaseSignedOut } from "@/lib/supabase/token-bridge"
import { isRealAuth } from "@/services/modes"
import { rehydratePersistedStores } from "@/store/persisted"

// Real auth: register the Supabase token source with apiClient at module load,
// so it is in place before the first query fires (child effects run before
// this component's effects). No-op on the server and in mock mode.
if (isRealAuth) installSupabaseTokenProvider()

export function AppProviders({ children }: { children: ReactNode }) {
  // Lazy init keeps one client per browser session and one per server request.
  const [queryClient] = useState(makeQueryClient)

  // Persisted stores skip automatic hydration so SSR markup matches; they
  // load stored values here, after hydration (policy in store/persisted.ts).
  useEffect(() => {
    rehydratePersistedStores()
  }, [])

  // Real auth: a session ended elsewhere (other tab, revoked refresh token)
  // drops this account's cached data; the next navigation hits the proxy.
  useEffect(() => {
    if (!isRealAuth) return
    return onSupabaseSignedOut(() => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.auth.all[0] })
      queryClient.setQueryData(queryKeys.auth.session(), null)
    })
  }, [queryClient])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
