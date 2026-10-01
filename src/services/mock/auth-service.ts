import { clearSessionHintCookie, setSessionHintCookie } from "@/lib/auth/client-session"
import { AppException } from "@/lib/utils/errors"
import type { AuthService } from "@/services/interfaces"
import type { AuthResult, AuthSession, GoogleAccountOption, GoogleSignInInput, Integration, User } from "@/types"

import type { MockDb } from "./db"
import { mockCall, mockWrite } from "./runtime"
import { isValidEmail, nowIso } from "./utils"

/*
 * Mock Google sign-in. Simulates the account chooser contract:
 *   - listGoogleAccounts() returns the demo chooser entries
 *   - signInWithGoogle({ accountId }) picks one; { loginHint } is
 *     "Use another account"
 *
 * The demo work account (waleed@wit-demo.com) is an existing, onboarded user
 * for intent "sign_in". Any other account, and intent "register", starts a
 * fresh onboarding. No token is created or stored anywhere: the only thing
 * written is the non-sensitive routing hint cookie (lib/auth).
 */

function nameFromEmail(email: string): { firstName: string; lastName: string } {
  const local = email.split("@")[0] ?? ""
  const parts = local.split(/[._-]+/).filter(Boolean)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return { firstName: cap(parts[0] ?? "New"), lastName: cap(parts[1] ?? "User") }
}

function resolveAccount(db: MockDb, input: GoogleSignInInput | undefined): GoogleAccountOption {
  const accounts = db.statics.googleAccounts
  if (input?.accountId) {
    const found = accounts.find((a) => a.id === input.accountId)
    if (!found) throw new AppException("not_found", { message: "That Google account isn't available. Choose another." })
    return found
  }
  if (input?.loginHint) {
    const email = input.loginHint.trim().toLowerCase()
    if (!isValidEmail(email)) {
      throw new AppException("validation_error", { details: { fieldErrors: { email: ["Enter a valid email address."] } } })
    }
    const known = accounts.find((a) => a.email.toLowerCase() === email)
    if (known) return known
    const { firstName, lastName } = nameFromEmail(email)
    return { id: `gacc_${email.replace(/[^a-z0-9]/g, "_")}`, name: `${firstName} ${lastName}`, email }
  }
  return accounts[0]
}

/** Fresh-account state: identity connected, calendar and Zoom not yet. */
function resetForNewUser(db: MockDb, account: GoogleAccountOption): User {
  const [first, ...rest] = account.name.split(/\s+/)
  const now = nowIso()
  const user: User = {
    ...db.statics.newUser,
    email: account.email,
    firstName: first ?? "",
    lastName: rest.join(" "),
    avatarUrl: account.avatarUrl,
    createdAt: now,
  }
  db.state.user = user
  db.state.onboarding = {
    ...db.statics.initialOnboarding,
    data: { ...db.statics.initialOnboarding.data, firstName: user.firstName, lastName: user.lastName },
    updatedAt: now,
  }
  db.state.integrations = db.state.integrations.map((integration): Integration => {
    switch (integration.provider) {
      case "google":
        return { ...integration, status: "connected", accountLabel: account.email, connectedAt: now, settings: {} }
      case "google_calendar":
      case "zoom":
        return { ...integration, status: "disconnected", accountLabel: undefined, connectedAt: undefined, settings: null } as Integration
      default:
        return integration
    }
  })
  db.state.settings = {
    ...db.state.settings,
    general: { ...db.state.settings.general, firstName: user.firstName, lastName: user.lastName, email: user.email, jobFunction: null, emailType: null },
  }
  return user
}

function restoreDemoUser(db: MockDb): User {
  const user = structuredClone(db.statics.demoUser)
  db.state.user = user
  db.state.onboarding = { ...db.state.onboarding, completed: true }
  db.state.integrations = structuredClone(db.statics.seedIntegrations)
  return user
}

function sessionOf(db: MockDb): AuthSession | null {
  const stage = db.stage
  if (stage === "unauthenticated") return null
  db.state.sessionExpiresAt ??= db.newSessionExpiry()
  return { user: db.state.user, stage, expiresAt: db.state.sessionExpiresAt }
}

export class MockAuthService implements AuthService {
  listGoogleAccounts(): Promise<GoogleAccountOption[]> {
    return mockCall("auth.listGoogleAccounts", (db) => db.statics.googleAccounts)
  }

  signInWithGoogle(input?: GoogleSignInInput): Promise<AuthResult> {
    return mockWrite("auth.signInWithGoogle", (db) => {
      const account = resolveAccount(db, input)
      const demoEmail = db.statics.demoUser.email.toLowerCase()
      const isDemoAccount = account.email.toLowerCase() === demoEmail
      const returning =
        input?.intent !== "register" &&
        db.state.accountEmail.toLowerCase() === account.email.toLowerCase() &&
        db.state.user.onboardingCompleted

      let user: User
      let isNewUser: boolean
      if (returning) {
        user = db.state.user
        isNewUser = false
      } else if (isDemoAccount && input?.intent !== "register") {
        user = restoreDemoUser(db)
        isNewUser = false
      } else {
        user = resetForNewUser(db, account)
        isNewUser = true
      }

      db.state.accountEmail = account.email
      db.state.sessionExpiresAt = db.newSessionExpiry()
      const stage = user.onboardingCompleted ? "ready" : "onboarding"
      setSessionHintCookie(stage)
      return { session: { user, stage, expiresAt: db.state.sessionExpiresAt }, isNewUser }
    })
  }

  signOut(): Promise<void> {
    return mockWrite("auth.signOut", (db) => {
      clearSessionHintCookie()
      db.state.sessionExpiresAt = null
      if (db.state.capture) db.state.capture = null
    })
  }

  getCurrentUser(): Promise<User | null> {
    return mockCall("auth.getCurrentUser", (db) => sessionOf(db)?.user ?? null)
  }

  getSession(): Promise<AuthSession | null> {
    return mockCall("auth.getSession", (db) => sessionOf(db))
  }
}
