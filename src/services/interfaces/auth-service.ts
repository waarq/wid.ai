import type { AuthResult, AuthSession, GoogleAccountOption, GoogleSignInInput, User } from "@/types"

/**
 * Google-first authentication. Credentials are held by the backend in
 * httpOnly cookies; nothing here returns or stores a token.
 */
export interface AuthService {
  /**
   * Accounts to show in the WIT account chooser. Real OAuth implementations
   * may return [] and defer to the provider's own chooser.
   */
  listGoogleAccounts(): Promise<GoogleAccountOption[]>
  signInWithGoogle(input?: GoogleSignInInput): Promise<AuthResult>
  signOut(): Promise<void>
  getCurrentUser(): Promise<User | null>
  /** null when unauthenticated. `stage` drives login/onboarding/portal routing. */
  getSession(): Promise<AuthSession | null>
}
