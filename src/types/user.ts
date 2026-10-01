import type { ISODateString, PersonRef } from "./common"

export const EMAIL_TYPES = ["company", "personal"] as const
/** Asked explicitly after Google sign-in. Never inferred from the email domain. */
export type EmailType = (typeof EMAIL_TYPES)[number]

export const JOB_FUNCTIONS = [
  "sales",
  "engineering",
  "product",
  "marketing",
  "customer_success",
  "operations",
  "management",
  "consulting",
  "recruiting",
  "executive",
  "other",
] as const
export type JobFunction = (typeof JOB_FUNCTIONS)[number]

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string
  /** Null until the user answers the email-type question. */
  emailType: EmailType | null
  /** Null until the job-function onboarding step is answered. */
  jobFunction: JobFunction | null
  /** IANA timezone, e.g. "Asia/Karachi". */
  timezone: string
  onboardingCompleted: boolean
  createdAt: ISODateString
}

export interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  timezone?: string
  jobFunction?: JobFunction
  emailType?: EmailType
}

export type WorkspaceRole = "owner" | "admin" | "member"

/** A teammate in the user's workspace. Powers Team Calls filters, share pickers and assignees. */
export interface WorkspaceMember extends PersonRef {
  email: string
  role: WorkspaceRole
  /** Team label, e.g. "Product". Used by the "My team" filter. */
  team?: string
  jobFunction?: JobFunction
  isCurrentUser: boolean
}
