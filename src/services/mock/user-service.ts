import { AppException } from "@/lib/utils/errors"
import type { UserService } from "@/services/interfaces"
import { EMAIL_TYPES, JOB_FUNCTIONS, type UpdateProfileInput, type User, type WorkspaceMember } from "@/types"

import type { MockDb } from "./db"
import { mockCall, mockWrite } from "./runtime"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const INLINE_AVATAR_BYTES = 512 * 1024

export function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** Validates and applies profile fields; shared with settings.general and onboarding. */
export function applyProfile(db: MockDb, input: UpdateProfileInput): User {
  const fieldErrors: Record<string, string[]> = {}
  const next: User = { ...db.state.user }
  const name = (key: "firstName" | "lastName", value: string | undefined) => {
    if (value === undefined) return
    const trimmed = value.trim()
    if (trimmed.length === 0) fieldErrors[key] = ["This field is required."]
    else if (trimmed.length > 60) fieldErrors[key] = ["Keep it under 60 characters."]
    else next[key] = trimmed
  }
  name("firstName", input.firstName)
  name("lastName", input.lastName)
  if (input.timezone !== undefined) {
    if (isValidTimezone(input.timezone)) next.timezone = input.timezone
    else fieldErrors.timezone = ["Choose a valid timezone."]
  }
  if (input.jobFunction !== undefined) {
    if ((JOB_FUNCTIONS as readonly string[]).includes(input.jobFunction)) next.jobFunction = input.jobFunction
    else fieldErrors.jobFunction = ["Choose a job function."]
  }
  if (input.emailType !== undefined) {
    if ((EMAIL_TYPES as readonly string[]).includes(input.emailType)) next.emailType = input.emailType
    else fieldErrors.emailType = ["Choose company or personal email."]
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new AppException("validation_error", { details: { fieldErrors } })
  }
  db.state.user = next
  db.state.settings.general = {
    ...db.state.settings.general,
    firstName: next.firstName,
    lastName: next.lastName,
    email: next.email,
    timezone: next.timezone,
    jobFunction: next.jobFunction,
    emailType: next.emailType,
  }
  return next
}

async function toAvatarUrl(file: Blob): Promise<string> {
  if (file.size <= INLINE_AVATAR_BYTES) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    let binary = ""
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return `data:${file.type};base64,${btoa(binary)}`
  }
  // Larger files: an in-memory URL (lost on refresh, which is fine for a mock).
  return typeof URL.createObjectURL === "function" ? URL.createObjectURL(file) : ""
}

export class MockUserService implements UserService {
  getProfile(): Promise<User> {
    return mockCall("user.getProfile", (db) => {
      db.requireSignedIn()
      return db.state.user
    })
  }

  updateProfile(input: UpdateProfileInput): Promise<User> {
    return mockWrite("user.updateProfile", (db) => {
      db.requireSignedIn()
      return applyProfile(db, input)
    })
  }

  uploadAvatar(file: Blob): Promise<User> {
    return mockWrite("user.uploadAvatar", async (db) => {
      db.requireSignedIn()
      if (!file.type.startsWith("image/")) {
        throw new AppException("validation_error", { details: { fieldErrors: { avatar: ["Choose an image file."] } } })
      }
      if (file.size > MAX_AVATAR_BYTES) {
        throw new AppException("validation_error", { details: { fieldErrors: { avatar: ["Images must be 5 MB or smaller."] } } })
      }
      const avatarUrl = await toAvatarUrl(file)
      db.state.user = { ...db.state.user, avatarUrl }
      return db.state.user
    })
  }

  listWorkspaceMembers(): Promise<WorkspaceMember[]> {
    return mockCall("user.listWorkspaceMembers", (db) => db.members())
  }
}
