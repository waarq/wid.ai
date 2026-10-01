import { cookies } from "next/headers"

import type { AuthStage } from "@/types"

import { SESSION_HINT_COOKIE, parseSessionHint } from "./session-hint"

/*
 * Server Component / Route Handler reader for the routing hint cookie.
 * Server-only (imports next/headers); import this file directly, it is
 * intentionally not re-exported from "@/lib/auth".
 *
 * Use it for presentation only, e.g. a marketing navbar choosing between
 * "Sign in" and "Open WIT". Never for authorization.
 *
 * Calling it opts the route into dynamic rendering (cookies() is a request
 * API), so keep it out of fully static marketing pages.
 */
export async function getSessionStage(): Promise<AuthStage> {
  const cookieStore = await cookies()
  return parseSessionHint(cookieStore.get(SESSION_HINT_COOKIE)?.value)
}
