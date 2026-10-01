import { setAuthTokenProvider } from "@/lib/api/client"

import { getSupabaseAccessToken, getSupabaseBrowserClient } from "./client"
import { isSupabaseConfigured } from "./config"

/*
 * Connects the Supabase browser session to apiClient: every API request asks
 * for the current access token. `auth.getSession()` returns the in-memory
 * session and refreshes it first when the token has expired or is about to,
 * and the client also auto-refreshes in the background, so a rotated token
 * is always what goes out. Nothing is copied into localStorage.
 *
 * Idempotent and browser-only. AppProviders installs it at module load (before
 * any query runs) when real auth is active.
 */

let installed = false

export function installSupabaseTokenProvider(): void {
  if (installed || typeof window === "undefined" || !isSupabaseConfigured()) return
  installed = true
  setAuthTokenProvider(() => getSupabaseAccessToken().catch(() => null))
}

/**
 * Notifies when the session ends outside a WID sign-out (another tab signed
 * out, refresh token revoked). Returns an unsubscribe function.
 */
export function onSupabaseSignedOut(callback: () => void): () => void {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return () => {}
  const { data } = getSupabaseBrowserClient().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") callback()
  })
  return () => data.subscription.unsubscribe()
}
