"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { toast } from "sonner"

import { oauthErrorMessage, oauthProviderLabel, parseOAuthReturn, stripOAuthReturn } from "@/lib/integrations/oauth-return"
import { queryKeys } from "@/lib/query"

/**
 * Handles the redirect back from provider OAuth (`?integration=...&result=...`):
 * toast, clean the query string, refresh integration / calendar / onboarding
 * data. Mount once on every page that can start a connection.
 */
export function useOAuthReturn(): void {
  const queryClient = useQueryClient()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    const outcome = parseOAuthReturn(window.location.search)
    if (!outcome) return
    handled.current = true

    const { pathname, search, hash } = window.location
    window.history.replaceState(window.history.state, "", stripOAuthReturn(pathname, search, hash))

    void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all })

    const label = oauthProviderLabel(outcome.provider)
    if (outcome.result === "connected") toast.success(`${label} connected`)
    else toast.error(`${label} couldn't be connected`, { description: oauthErrorMessage(outcome.reason) })
  }, [queryClient])
}
