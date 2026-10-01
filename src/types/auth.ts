import type { ISODateString } from "./common"
import type { User } from "./user"

/**
 * Where an authenticated or anonymous visitor belongs.
 * unauthenticated -> /login, onboarding -> /onboarding, ready -> /my-calls.
 * This is a routing hint only; the backend remains the authority.
 */
export type AuthStage = "unauthenticated" | "onboarding" | "ready"

/**
 * Session metadata visible to the frontend. Credentials themselves live in
 * httpOnly cookies managed by the backend and are never exposed here.
 */
export interface AuthSession {
  user: User
  stage: Exclude<AuthStage, "unauthenticated">
  expiresAt: ISODateString
}

export interface AuthResult {
  session: AuthSession
  /** True when this sign-in created the account (register flow). */
  isNewUser: boolean
}

/** One entry in the Google account chooser. */
export interface GoogleAccountOption {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface GoogleSignInInput {
  /** Pre-selects an account from the chooser (maps to OAuth `login_hint`). */
  accountId?: string
  loginHint?: string
  intent: "sign_in" | "register"
}
