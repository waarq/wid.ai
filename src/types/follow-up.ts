import type { ISODateString } from "./common"

export type FollowUpTone = "concise" | "detailed" | "friendly"

export interface FollowUpRecipient {
  name: string
  email: string
}

export interface FollowUpNextStep {
  owner: string
  task: string
  actionItemId?: string
}

/** Generated follow-up email. Copy/Edit happen client-side; sending plugs in later. */
export interface FollowUpEmail {
  meetingId: string
  subject: string
  /** Plain text, ready to copy. */
  body: string
  recipients: FollowUpRecipient[]
  decisions: string[]
  nextSteps: FollowUpNextStep[]
  tone: FollowUpTone
  generatedAt: ISODateString
}

export interface GenerateFollowUpInput {
  tone?: FollowUpTone
  /** Sign-off name; defaults to the current user's first name. */
  signOffName?: string
}
