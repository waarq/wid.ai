import type { AuthStage } from "@/types"

import {
  SESSION_HINT_COOKIE,
  SESSION_HINT_MAX_AGE_SECONDS,
  readSessionHintFromCookieString,
  serializeSessionHint,
  type SessionHintStage,
} from "./session-hint"

/*
 * Browser-side writers for the non-sensitive routing hint cookie (see
 * session-hint.ts). Used by the mock auth/onboarding services so proxy.ts can
 * route on the next navigation. A real backend sets its own httpOnly session
 * cookie instead; these helpers never handle credentials.
 *
 * Safe to import anywhere: every function is a no-op outside the browser.
 * When `document` is unavailable (Node scripts, tests) the stage is kept in
 * memory so the same code paths still work.
 */

let memoryStage: AuthStage = "unauthenticated"

function hasDocument(): boolean {
  return typeof document !== "undefined"
}

function secureAttribute(): string {
  return typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : ""
}

export function setSessionHintCookie(stage: SessionHintStage): void {
  memoryStage = stage
  if (!hasDocument()) return
  document.cookie =
    `${SESSION_HINT_COOKIE}=${encodeURIComponent(serializeSessionHint(stage))}` +
    `; Path=/; Max-Age=${SESSION_HINT_MAX_AGE_SECONDS}; SameSite=Lax${secureAttribute()}`
}

export function clearSessionHintCookie(): void {
  memoryStage = "unauthenticated"
  if (!hasDocument()) return
  document.cookie = `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secureAttribute()}`
}

export function readClientSessionStage(): AuthStage {
  return hasDocument() ? readSessionHintFromCookieString(document.cookie) : memoryStage
}
