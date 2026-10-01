import { NextResponse, type NextRequest } from "next/server"

import { resolveRouteAccess } from "@/lib/auth/routes"
import { SESSION_HINT_COOKIE, parseSessionHint } from "@/lib/auth/session-hint"

/*
 * Route guarding (Next.js 16 `proxy.ts`, formerly middleware).
 *
 * MOCK GATING ONLY. The stage comes from a non-sensitive hint cookie
 * (`wid_session_hint`, see lib/auth/session-hint.ts) that anyone could set.
 * It decides which screen to show first, nothing more. Real authorization is
 * enforced by the backend on every API call; never trust this file for
 * access control.
 *
 *   route kind       unauthenticated            onboarding        ready
 *   app (/my-calls…) -> /login?next=<path>       -> /onboarding    allow
 *   /onboarding      -> /login?next=/onboarding  allow             -> /my-calls
 *   /login,/register allow                      -> /onboarding    -> next (if safe app path) or /my-calls
 *   /dashboard/*     -> same path without /dashboard (legacy PRD links)
 *   everything else  allow (marketing stays public)
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const stage = parseSessionHint(request.cookies.get(SESSION_HINT_COOKIE)?.value)
  const decision = resolveRouteAccess(pathname, stage, search)

  if (decision.type === "allow") return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = decision.pathname
  url.search = decision.search ?? ""
  return NextResponse.redirect(url)
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
