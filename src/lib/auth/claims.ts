import type { AuthStage } from "@/types"

/*
 * Real-auth routing stage. The Supabase Custom Access Token Hook writes
 * `app_stage: "onboarding" | "ready"` into the JWT from
 * profiles.onboarding_completed_at (docs/backend/03-security-rls.md 2.4).
 * The proxy reads it from claims that `supabase.auth.getClaims()` has already
 * verified. Like the mock hint cookie, this only picks the first screen; the
 * API authorizes every request.
 */

export const APP_STAGE_CLAIM = "app_stage"

/** The subset of verified JWT claims the router looks at. */
export type StageClaims = { sub?: unknown; role?: unknown; [APP_STAGE_CLAIM]?: unknown } | null | undefined

/**
 * - no claims, no `sub`, or a non-"authenticated" role -> unauthenticated
 * - `app_stage` "ready" / "onboarding"                  -> that stage
 * - signed in but the claim is missing or unknown       -> onboarding
 *
 * The last case only happens when the access-token hook is not installed (or
 * a token predates it). "onboarding" is the narrower of the two signed-in
 * stages; `/onboarding` re-checks the server stage via the API.
 */
export function stageFromClaims(claims: StageClaims): AuthStage {
  if (!claims || typeof claims.sub !== "string" || claims.sub.length === 0) return "unauthenticated"
  if (claims.role !== undefined && claims.role !== "authenticated") return "unauthenticated"
  const stage = claims[APP_STAGE_CLAIM]
  if (stage === "ready" || stage === "onboarding") return stage
  return "onboarding"
}
