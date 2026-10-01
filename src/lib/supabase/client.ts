import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

import { AppException } from "@/lib/utils/errors"

import { isSupabaseConfigured, supabaseConfig } from "./config"

/*
 * Browser Supabase client (@supabase/ssr). The session lives in `sb-*`
 * cookies (not localStorage) so the proxy and route handlers can read the
 * same session. @supabase/ssr returns one singleton per browser tab and
 * refreshes the access token in the background.
 *
 * Only Api* services and the token bridge use this. UI code goes through
 * `services.auth`.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new AppException("service_unavailable", {
      cause: new Error("getSupabaseBrowserClient() was called outside the browser."),
    })
  }
  if (!isSupabaseConfigured()) {
    throw new AppException("service_unavailable", {
      cause: new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set."),
    })
  }
  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
}

/** Current access token, refreshed first when it is expired or about to expire. */
export async function getSupabaseAccessToken(): Promise<string | null> {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return null
  const { data } = await getSupabaseBrowserClient().auth.getSession()
  return data.session?.access_token ?? null
}

/**
 * Re-mints the access token so new claims (notably `app_stage`) reach the
 * proxy on the next navigation.
 *
 * PHASE 2: `ApiOnboardingService.complete()` must call this right after
 * `POST /v1/onboarding/complete` succeeds, before the UI routes to
 * /my-calls. Otherwise the proxy still sees `app_stage: "onboarding"` and
 * bounces the user back to /onboarding until the token next refreshes.
 */
export async function refreshSessionClaims(): Promise<void> {
  const { error } = await getSupabaseBrowserClient().auth.refreshSession()
  if (error) throw new AppException("unauthorized", { cause: error })
}
