import { createServerClient } from "@supabase/ssr"
import type { JwtPayload } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { isSupabaseConfigured, supabaseConfig } from "./config"

export interface SupabaseProxyResult {
  /** Pass-through response carrying any refreshed `sb-*` cookies. */
  response: NextResponse
  /** Verified JWT claims, or null when signed out / invalid / unconfigured. */
  claims: JwtPayload | null
}

/*
 * Proxy helper (@supabase/ssr "middleware" pattern, adapted to Next 16
 * proxy.ts). Reads the session from request cookies, refreshes it when the
 * access token is expiring, and writes the rotated cookies both onto the
 * forwarded request (so Server Components see them) and onto the response
 * (so the browser stores them).
 *
 * `getClaims()` verifies the JWT locally against the project's JWKS
 * (asymmetric keys), so this is not a network call per request.
 *
 * Any redirect built afterwards must copy the cookies over with
 * `withSupabaseCookies(response, redirect)`, or a refresh is lost.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<SupabaseProxyResult> {
  let response = NextResponse.next({ request })
  if (!isSupabaseConfigured()) return { response, claims: null }

  const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        // Responses that set auth cookies must never be cached by a CDN.
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value)
      },
    },
  })

  // Nothing may run between client creation and getClaims(): it is what
  // triggers the refresh and the cookie write above.
  try {
    const { data, error } = await supabase.auth.getClaims()
    return { response, claims: error || !data ? null : data.claims }
  } catch {
    return { response, claims: null }
  }
}

/** Copies refreshed auth cookies and no-cache headers from `source` onto `target`. */
export function withSupabaseCookies(source: NextResponse, target: NextResponse): NextResponse {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(key)
    if (value) target.headers.set(key, value)
  }
  return target
}
