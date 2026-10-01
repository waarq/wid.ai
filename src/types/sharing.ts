import type { ISODateString } from "./common"
import type { MeetingVisibility } from "./meeting"

export type ShareRecipientSource = "attendee" | "invited" | "team"

export interface ShareRecipient {
  id: string
  name: string
  email: string
  avatarUrl?: string
  source: ShareRecipientSource
  addedAt: ISODateString
  /** Backend-computed. The UI hides "Remove" when false. */
  canRemove: boolean
}

export interface ShareLink {
  url: string
  createdAt: ISODateString
}

export interface ShareSettings {
  meetingId: string
  visibility: MeetingVisibility
  recipients: ShareRecipient[]
  /** Workspace capability. "Anyone with the link" is only offered when true. */
  linkSharingAvailable: boolean
  /** null when link sharing is off. */
  link: ShareLink | null
  /** Backend-computed permission. Never derived in the UI. */
  canManage: boolean
}

export interface ShareMeetingInput {
  visibility?: MeetingVisibility
  /** Additional people to grant access, by email. */
  inviteEmails?: string[]
  /** Toggle "Anyone with the link". Ignored unless linkSharingAvailable. */
  linkEnabled?: boolean
}
