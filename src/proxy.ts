import { NextResponse, type NextRequest } from "next/server"

import { stageFromClaims } from "@/lib/auth/claims"
import { resolveRouteAccess, type RouteDecision } from "@/lib/auth/routes"
import { SESSION_HINT_COOKIE, parseSessionHint } from "@/lib/auth/session-hint"
import { updateSupabaseSession, withSupabaseCookies } from "@/lib/supabase/proxy"
import { isRealAuth } from "@/services/modes"

/*
 * Route guarding (Next.js 16 `proxy.ts`, formerly middleware).
 *
 * UX ROUTING ONLY. Real authorization is enforced by the backend on every API
 * call; never trust this file for access control. Where the stage comes from:
 *
 *   mock auth (default)  the non-sensitive `wid_session_hint` cookie
 *                        (lib/auth/session-hint.ts), which anyone could set.
 *   real auth            `app_stage` in the Supabase JWT, verified by
 *                        `getClaims()` (lib/auth/claims.ts). The hint cookie is
 *                        ignored. The session cookies are refreshed here too.
 *
 *   route kind       unauthenticated            onboarding        ready
 *   app (/my-calls…) -> /login?next=<path>       -> /onboarding    allow
 *   /onboarding      -> /login?next=/onboarding  allow             -> /my-calls
 *   /login,/register allow                      -> /onboarding    -> next (if safe app path) or /my-calls
 *   /dashboard/*     -> same path without /dashboard (legacy PRD links)
 *   everything else  allow (marketing and /auth/callback stay public)
 */

function redirectFor(request: NextRequest, decision: Extract<RouteDecision, { type: "redirect" }>): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = decision.pathname
  url.search = decision.search ?? ""
  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (!isRealAuth) {
    const stage = parseSessionHint(request.cookies.get(SESSION_HINT_COOKIE)?.value)
    const decision = resolveRouteAccess(pathname, stage, search)
    return decision.type === "allow" ? NextResponse.next() : redirectFor(request, decision)
  }

  const { response, claims } = await updateSupabaseSession(request)
  const decision = resolveRouteAccess(pathname, stageFromClaims(claims), search)
  if (decision.type === "allow") return response
  // Keep any refreshed session cookies on the redirect.
  return withSupabaseCookies(response, redirectFor(request, decision))
}

export const config = {
  matcher: [
    /*
     * Everything except API routes, Next internals, metadata files and any
     * path with a static-file extension (public/ assets, images, fonts).
     * Must be a literal so Next can analyse it at build time.
     */
    "/((?!api|_next/static|_next/image|_next/data|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|json|webmanifest|woff2?|ttf|otf|mp3|mp4|webm|wav|pdf|js|css|map)$).*)",
  ],
}
