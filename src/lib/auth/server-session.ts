import { cookies } from "next/headers"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { isRealAuth } from "@/services/modes"
import type { AuthStage } from "@/types"

import { stageFromClaims } from "./claims"
import { SESSION_HINT_COOKIE, parseSessionHint } from "./session-hint"

/*
 * Server Component / Route Handler reader for the routing stage.
 * Server-only (imports next/headers); import this file directly, it is
 * intentionally not re-exported from "@/lib/auth".
 *
 * Mock auth reads the hint cookie; real auth reads `app_stage` from the
 * verified Supabase claims. Use it for presentation only, e.g. a marketing
 * navbar choosing between "Sign in" and "Open WID". Never for authorization.
 *
 * Calling it opts the route into dynamic rendering (cookies() is a request
 * API), so keep it out of fully static marketing pages.
 */
export async function getSessionStage(): Promise<AuthStage> {
  if (isRealAuth) {
    try {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getClaims()
      return stageFromClaims(data?.claims)
    } catch {
      return "unauthenticated"
    }
  }
  const cookieStore = await cookies()
  return parseSessionHint(cookieStore.get(SESSION_HINT_COOKIE)?.value)
}
