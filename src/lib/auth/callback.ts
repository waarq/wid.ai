import type { AuthStage, GoogleSignInInput } from "@/types"

import { LOGIN_PATH, NEXT_PARAM, REGISTER_PATH, getPostAuthPath, getSafeNextPath } from "./routes"

/*
 * Pure helpers for the OAuth round trip:
 *
 *   /login -> Supabase signInWithOAuth(redirectTo = /auth/callback?next&intent)
 *          -> Google -> Supabase -> /auth/callback?code=...
 *          -> exchange code, POST /v1/auth/bootstrap -> /onboarding | next | /my-calls
 *
 * Failures land on /login?error=<flag>. Flags are a closed set mapped to
 * user-safe copy; nothing from the provider or the API is echoed to the UI.
 */

export const AUTH_CALLBACK_PATH = "/auth/callback"
export const AUTH_ERROR_PARAM = "error"
export const INTENT_PARAM = "intent"

export const AUTH_CALLBACK_ERRORS = [
  /** The user cancelled on Google, or the provider returned an error. */
  "oauth_cancelled",
  /** No code, or the code could not be exchanged (expired, reused, PKCE mismatch). */
  "oauth_failed",
  /** Signed in with Google, but the WID API could not set up the account. */
  "bootstrap_failed",
  /** Supabase or the API is not configured / reachable. */
  "auth_unavailable",
] as const

export type AuthCallbackError = (typeof AUTH_CALLBACK_ERRORS)[number]

export const AUTH_CALLBACK_ERROR_MESSAGES: Record<AuthCallbackError, string> = {
  oauth_cancelled: "Google sign-in was cancelled. Nothing was changed.",
  oauth_failed: "We couldn't finish signing you in with Google. Please try again.",
  bootstrap_failed: "You signed in with Google, but we couldn't set up your WID account. Please try again.",
  auth_unavailable: "Sign-in isn't available right now. Please try again in a moment.",
}

export function parseAuthCallbackError(value: string | string[] | null | undefined): AuthCallbackError | null {
  const raw = Array.isArray(value) ? value[0] : value
  return raw && (AUTH_CALLBACK_ERRORS as readonly string[]).includes(raw) ? (raw as AuthCallbackError) : null
}

export function parseIntent(value: string | null | undefined): GoogleSignInInput["intent"] {
  return value === "register" ? "register" : "sign_in"
}

/**
 * The `redirectTo` handed to Supabase. Must be allow-listed in Supabase Auth
 * URL configuration (use `<origin>/auth/callback**` so the query is allowed).
 */
export function buildAuthCallbackUrl(
  origin: string,
  options: { next?: string | null; intent?: GoogleSignInInput["intent"] } = {},
): string {
  const url = new URL(AUTH_CALLBACK_PATH, origin)
  const next = getSafeNextPath(options.next)
  if (next) url.searchParams.set(NEXT_PARAM, next)
  if (options.intent === "register") url.searchParams.set(INTENT_PARAM, "register")
  return url.toString()
}

/** Where a successful callback sends the user (path + query, same origin). */
export function getCallbackSuccessPath(stage: AuthStage, next: string | null | undefined): string {
  return getPostAuthPath(stage, next)
}

/** Where a failed callback sends the user: the matching auth page with an error flag and the safe next. */
export function getCallbackErrorPath(
  error: AuthCallbackError,
  options: { next?: string | null; intent?: GoogleSignInInput["intent"] } = {},
): string {
  const params = new URLSearchParams({ [AUTH_ERROR_PARAM]: error })
  const next = getSafeNextPath(options.next)
  if (next) params.set(NEXT_PARAM, next)
  return `${options.intent === "register" ? REGISTER_PATH : LOGIN_PATH}?${params.toString()}`
}

/** Maps the provider's `?error=` (RFC 6749) to our flag. */
export function callbackErrorFromProvider(providerError: string | null): AuthCallbackError | null {
  if (!providerError) return null
  return providerError === "access_denied" ? "oauth_cancelled" : "oauth_failed"
}

/**
 * NEXT_PUBLIC_API_URL may be relative ("/api") for same-origin deployments.
 * Server-side fetch needs an absolute URL, so resolve it against the request.
 */
export function resolveApiBaseUrl(baseUrl: string, origin: string): string {
  const absolute = /^https?:\/\//i.test(baseUrl) ? baseUrl : new URL(baseUrl, origin).toString()
  return absolute.endsWith("/") ? absolute.slice(0, -1) : absolute
}
