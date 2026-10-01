import { apiClient } from "@/lib/api/client"
import { buildAuthCallbackUrl } from "@/lib/auth/callback"
import { getSupabaseAccessToken, getSupabaseBrowserClient } from "@/lib/supabase/client"
import { AppException, isAppError } from "@/lib/utils/errors"
import type { AuthService } from "@/services/interfaces"
import type { AuthResult, AuthSession, GoogleAccountOption, GoogleSignInInput, User } from "@/types"

/*
 * Real Google sign-in through Supabase Auth (docs/backend/03-security-rls.md 2.3).
 *
 *   signInWithGoogle  -> supabase.auth.signInWithOAuth, the browser leaves for
 *                        Google; /auth/callback finishes the job server side.
 *   signOut           -> supabase.auth.signOut (local), then POST /v1/auth/sign-out
 *   getCurrentUser    -> GET /v1/me            (401 -> null)
 *   getSession        -> GET /v1/auth/session  (401 -> null)
 *
 * The bearer token reaches apiClient through setAuthTokenProvider (see
 * lib/supabase/token-bridge.ts, installed by AppProviders).
 */

const SIGN_OUT_TIMEOUT_MS = 5_000

/** Never settles: the page is navigating to Google. The UI shows "Redirecting to Google...". */
function navigatingAway<T>(): Promise<T> {
  return new Promise<T>(() => {})
}

async function nullOnUnauthorized<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await request()
  } catch (error) {
    if (isAppError(error) && error.code === "unauthorized") return null
    throw error
  }
}

export class ApiAuthService implements AuthService {
  /** Google's own account chooser replaces WID's mock chooser. */
  async listGoogleAccounts(): Promise<GoogleAccountOption[]> {
    return []
  }

  async signInWithGoogle(input?: GoogleSignInInput): Promise<AuthResult> {
    const supabase = getSupabaseBrowserClient()
    // Current origin, not NEXT_PUBLIC_APP_URL: the PKCE code verifier cookie
    // is stored on this origin, so the callback must come back to it.
    const redirectTo = buildAuthCallbackUrl(window.location.origin, { next: input?.next, intent: input?.intent })
    const queryParams: Record<string, string> = { prompt: "select_account" }
    const loginHint = input?.loginHint?.trim()
    if (loginHint) queryParams.login_hint = loginHint

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams },
    })
    if (error) throw new AppException("service_unavailable", { cause: error })

    // intent: "register" makes no difference to OAuth; the bootstrap call in
    // /auth/callback reports isNewUser. This promise intentionally never
    // resolves because the browser is leaving the page.
    return navigatingAway<AuthResult>()
  }

  async signOut(): Promise<void> {
    // Capture the token first: after the local sign-out the provider returns null.
    const token = await getSupabaseAccessToken().catch(() => null)

    const { error } = await getSupabaseBrowserClient().auth.signOut({ scope: "local" })
    if (error) throw new AppException("server_error", { cause: error })

    if (!token) return
    // Best effort audit + capture cleanup. The user is signed out locally either way.
    await apiClient
      .post<void>("/v1/auth/sign-out", undefined, {
        headers: { authorization: `Bearer ${token}` },
        timeoutMs: SIGN_OUT_TIMEOUT_MS,
      })
      .catch(() => undefined)
  }

  getCurrentUser(): Promise<User | null> {
    return nullOnUnauthorized(() => apiClient.get<User>("/v1/me"))
  }

  getSession(): Promise<AuthSession | null> {
    return nullOnUnauthorized(() => apiClient.get<AuthSession>("/v1/auth/session"))
  }
}
