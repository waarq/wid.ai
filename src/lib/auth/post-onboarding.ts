/*
 * Pure helpers for leaving onboarding. The proxy reads `app_stage` from the
 * JWT; if the claim is stale a hard navigation to /my-calls bounces back to
 * /onboarding, which would auto-redirect again. The guard breaks that loop.
 */

export const POST_ONBOARDING_DELAY_MS = 2500
const REDIRECT_GUARD_MS = 15_000

/** False when an automatic redirect already ran moments ago (stale-claim loop). */
export function shouldAutoRedirect(lastAttemptAt: number | null, now: number): boolean {
  if (lastAttemptAt === null || Number.isNaN(lastAttemptAt)) return true
  return now - lastAttemptAt > REDIRECT_GUARD_MS
}
