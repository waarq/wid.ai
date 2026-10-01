import type { AuthStage } from "@/types"

/*
 * Route classification and the three-state routing rule from the PRD
 * ("Auth / onboarding route guarding"). Pure functions so they can be tested
 * without Next.js and reused by the proxy and by client-side redirects.
 *
 *   unauthenticated               -> /login
 *   authenticated, onboarding     -> /onboarding
 *   authenticated, complete       -> /my-calls
 *
 * App routes are route-group paths ((app)/my-calls -> /my-calls); there is no
 * /dashboard prefix. Legacy /dashboard/* links are redirected to the real path.
 *
 * This is UX routing only. The backend authorizes every request.
 */

export const LOGIN_PATH = "/login"
export const REGISTER_PATH = "/register"
export const ONBOARDING_PATH = "/onboarding"
export const APP_HOME_PATH = "/my-calls"
export const NEXT_PARAM = "next"

export const APP_ROUTE_PREFIXES = [
  "/my-calls",
  "/team-calls",
  "/playlist",
  "/alerts",
  "/deals",
  "/settings",
  "/profile",
] as const

export const AUTH_ROUTES = [LOGIN_PATH, REGISTER_PATH] as const

const LEGACY_DASHBOARD_PREFIX = "/dashboard"

export const HOME_PATH_FOR_STAGE: Record<AuthStage, string> = {
  unauthenticated: LOGIN_PATH,
  onboarding: ONBOARDING_PATH,
  ready: APP_HOME_PATH,
}

export type RouteKind = "app" | "onboarding" | "auth" | "legacy_dashboard" | "public"

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function classifyRoute(pathname: string): RouteKind {
  if (APP_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return "app"
  if (matchesPrefix(pathname, ONBOARDING_PATH)) return "onboarding"
  if ((AUTH_ROUTES as readonly string[]).includes(pathname)) return "auth"
  if (matchesPrefix(pathname, LEGACY_DASHBOARD_PREFIX)) return "legacy_dashboard"
  return "public"
}

export function isAppRoute(pathname: string): boolean {
  return classifyRoute(pathname) === "app"
}

/**
 * Accepts only same-origin, absolute paths ("/my-calls?x=1"). Rejects
 * protocol-relative ("//evil"), backslash tricks, schemes and auth routes
 * (to avoid redirect loops). Returns null when unsafe.
 */
export function getSafeNextPath(value: string | null | undefined): string | null {
  if (!value || value.length > 512) return null
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null
  if (/[\u0000-\u001f]/.test(value)) return null
  const pathname = value.split(/[?#]/, 1)[0]
  const kind = classifyRoute(pathname)
  if (kind === "auth" || kind === "legacy_dashboard") return null
  return value
}

export type RouteDecision =
  | { type: "allow" }
  | { type: "redirect"; pathname: string; search?: string }

const ALLOW: RouteDecision = { type: "allow" }

function redirectTo(pathname: string, search?: string): RouteDecision {
  return search ? { type: "redirect", pathname, search } : { type: "redirect", pathname }
}

function withNext(target: string): string {
  return `?${new URLSearchParams({ [NEXT_PARAM]: target }).toString()}`
}

/**
 * Decides whether a request may render or where it should go instead.
 * `search` is the raw query string including "?" (or "").
 */
export function resolveRouteAccess(pathname: string, stage: AuthStage, search = ""): RouteDecision {
  const kind = classifyRoute(pathname)

  switch (kind) {
    case "public":
      return ALLOW

    case "legacy_dashboard": {
      const stripped = pathname.slice(LEGACY_DASHBOARD_PREFIX.length) || APP_HOME_PATH
      return redirectTo(stripped, search || undefined)
    }

    case "app":
      if (stage === "unauthenticated") return redirectTo(LOGIN_PATH, withNext(`${pathname}${search}`))
      if (stage === "onboarding") return redirectTo(ONBOARDING_PATH)
      return ALLOW

    case "onboarding":
      if (stage === "unauthenticated") return redirectTo(LOGIN_PATH, withNext(ONBOARDING_PATH))
      if (stage === "ready") return redirectTo(APP_HOME_PATH)
      return ALLOW

    case "auth": {
      if (stage === "unauthenticated") return ALLOW
      if (stage === "onboarding") return redirectTo(ONBOARDING_PATH)
      const next = getSafeNextPath(new URLSearchParams(search).get(NEXT_PARAM))
      if (next && classifyRoute(next.split(/[?#]/, 1)[0]) === "app") {
        const [nextPath, ...rest] = next.split("?")
        return redirectTo(nextPath, rest.length > 0 ? `?${rest.join("?")}` : undefined)
      }
      return redirectTo(APP_HOME_PATH)
    }
  }
}

/** Where to send the user right after sign-in / onboarding, honouring a safe `next`. */
export function getPostAuthPath(stage: AuthStage, next?: string | null): string {
  if (stage !== "ready") return HOME_PATH_FOR_STAGE[stage]
  const safe = getSafeNextPath(next)
  return safe && classifyRoute(safe.split(/[?#]/, 1)[0]) === "app" ? safe : APP_HOME_PATH
}
