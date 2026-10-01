import { NextResponse, type NextRequest } from "next/server"

import { apiConfig } from "@/lib/api/config"
import { bootstrapAccount } from "@/lib/auth/bootstrap"
import {
  callbackErrorFromProvider,
  getCallbackErrorPath,
  getCallbackSuccessPath,
  parseIntent,
  resolveApiBaseUrl,
  type AuthCallbackError,
} from "@/lib/auth/callback"
import { stageFromClaims } from "@/lib/auth/claims"
import { NEXT_PARAM } from "@/lib/auth/routes"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isAppError } from "@/lib/utils/errors"

/*
 * OAuth return leg (PKCE). Supabase redirects here with `?code=` after Google:
 *
 *   1. exchangeCodeForSession(code)       sets the sb-* session cookies
 *   2. POST {API}/v1/auth/bootstrap       idempotent account setup, returns the stage
 *   3. redirect by stage                  /onboarding, or a safe `next`, or /my-calls
 *
 * Any failure clears the half-made local session and lands on
 * /login?error=<flag> (or /register for the register intent). The flag is a
 * closed set mapped to user-safe copy (lib/auth/callback.ts).
 *
 * Always dynamic: it reads the request and writes cookies.
 */

function redirectTo(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin))
  // The response carries session cookies: never cache it.
  response.headers.set("cache-control", "private, no-store")
  return response
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const next = params.get(NEXT_PARAM)
  const intent = parseIntent(params.get("intent"))
  const fail = (error: AuthCallbackError) => redirectTo(request, getCallbackErrorPath(error, { next, intent }))

  const providerError = callbackErrorFromProvider(params.get("error"))
  if (providerError) return fail(providerError)

  const code = params.get("code")
  if (!code) return fail("oauth_failed")
  if (!isSupabaseConfigured()) return fail("auth_unavailable")

  const supabase = await createSupabaseServerClient()

  const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  const accessToken = exchanged.session?.access_token
  if (exchangeError || !accessToken) return fail("oauth_failed")

  try {
    const result = await bootstrapAccount({
      apiBaseUrl: resolveApiBaseUrl(apiConfig.baseUrl, request.nextUrl.origin),
      accessToken,
      intent,
    })

    // The token was minted before bootstrap ran. If the hook's app_stage
    // disagrees with the API (first sign-in races, hook lag), re-mint it so
    // the proxy routes the next navigation correctly. Best effort.
    const { data: claimsData } = await supabase.auth.getClaims()
    if (stageFromClaims(claimsData?.claims) !== result.stage) {
      await supabase.auth.refreshSession().catch(() => undefined)
    }

    return redirectTo(request, getCallbackSuccessPath(result.stage, next))
  } catch (error) {
    // Don't leave a signed-in Supabase session without a WID account: the
    // proxy would otherwise route the user to /onboarding.
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined)
    const unavailable =
      isAppError(error) && (error.code === "network_error" || error.code === "timeout" || error.code === "service_unavailable")
    return fail(unavailable ? "auth_unavailable" : "bootstrap_failed")
  }
}
