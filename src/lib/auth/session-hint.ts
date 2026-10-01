import type { AuthStage } from "@/types"

/*
 * MOCK ROUTE GATING ONLY. READ BEFORE CHANGING.
 *
 * The "session hint" is a tiny, non-sensitive cookie that tells `src/proxy.ts`
 * which of the three routing stages a visitor is in. It holds no identity,
 * no token and no secret: just a version and a stage, e.g. `v1.ready`.
 * Anyone can forge it, and that is fine, because it only decides which page
 * to show first. It must never be used to authorize anything.
 *
 * Real authorization is enforced by the backend on every API request, using
 * its own httpOnly session cookie (or a bearer token held in memory, see
 * `setAuthTokenProvider` in lib/api). When a real backend lands it can keep
 * setting this hint cookie for routing, or proxy.ts can read its own cookie.
 *
 * This module is isomorphic (no browser or Node APIs) so the proxy, server
 * components and client code can all share it.
 */

export const SESSION_HINT_COOKIE = "wit_session_hint"
export const SESSION_HINT_VERSION = "v1"
/** 7 days. The hint expires on its own; the backend session is what matters. */
export const SESSION_HINT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export type SessionHintStage = Exclude<AuthStage, "unauthenticated">

export function serializeSessionHint(stage: SessionHintStage): string {
  return `${SESSION_HINT_VERSION}.${stage}`
}

/** Unknown, malformed or missing values all read as "unauthenticated". */
export function parseSessionHint(value: string | undefined | null): AuthStage {
  if (!value) return "unauthenticated"
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    return "unauthenticated"
  }
  const [version, stage] = decoded.split(".")
  if (version !== SESSION_HINT_VERSION) return "unauthenticated"
  return stage === "onboarding" || stage === "ready" ? stage : "unauthenticated"
}

/** Reads the hint out of a raw `Cookie` header / `document.cookie` string. */
export function readSessionHintFromCookieString(cookieString: string | undefined | null): AuthStage {
  if (!cookieString) return "unauthenticated"
  for (const part of cookieString.split(";")) {
    const index = part.indexOf("=")
    if (index === -1) continue
    if (part.slice(0, index).trim() === SESSION_HINT_COOKIE) {
      return parseSessionHint(part.slice(index + 1).trim())
    }
  }
  return "unauthenticated"
}
