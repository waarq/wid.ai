import type { CaptureMode } from "./capture"
import type { ISODateString } from "./common"
import type { CapturePreference, MeetingFocus, SharingPreference } from "./onboarding"
import type { EmailType, JobFunction } from "./user"

export const SETTINGS_SECTIONS = [
  "general",
  "meetings",
  "capture",
  "sharing",
  "ai",
  "notifications",
  "integrations",
  "security",
  "appearance",
] as const
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]

/** Mirrors the profile fields. Saving it must also refresh the profile query. */
export interface GeneralSettings {
  firstName: string
  lastName: string
  /** Read-only: comes from the Google identity. */
  email: string
  timezone: string
  jobFunction: JobFunction | null
  emailType: EmailType | null
}

export interface MeetingSettings {
  defaultSharing: SharingPreference
  /** Which insight types WID extracts from meetings. */
  meetingFocus: MeetingFocus[]
}

export interface CaptureSettings {
  /**
   * Product rule, encoded in the type: WID never records automatically.
   * Displayed as a locked "Enabled" switch.
   */
  manualCapture: true
  capturePreference: CapturePreference
  defaultCaptureMode: CaptureMode
  /** Ask for confirmation before a capture starts. */
  confirmBeforeCapture: boolean
}

export interface SharingSettings {
  /** Workspace capability. When false, "Anyone with the link" is never offered. */
  linkSharingAvailable: boolean
  includeTranscriptWhenSharing: boolean
  includeRecordingWhenSharing: boolean
  allowRecipientsToReshare: boolean
}

export type SummaryLength = "brief" | "standard" | "detailed"

export interface AiSettings {
  /** Ordered emphasis among the focus types; first is weighted highest. */
  priorities: MeetingFocus[]
  summaryLength: SummaryLength
  /** Tailor summaries and suggested questions to the user's job function. */
  personalizeByJobFunction: boolean
  showSuggestedQuestions: boolean
}

export interface NotificationSettings {
  processingCompleted: boolean
  actionItemReminders: boolean
  mentions: boolean
  sharedMeetings: boolean
  dealUpdates: boolean
  weeklySummary: boolean
  channels: { inApp: boolean; email: boolean }
}

export interface ActiveSession {
  id: string
  device: string
  browser?: string
  location?: string
  lastActiveAt: ISODateString
  isCurrent: boolean
}

export interface SecuritySettings {
  signInMethod: "google"
  sessions: ActiveSession[]
  /** Days recordings are retained; null keeps them until deleted. */
  recordingRetentionDays: number | null
}

export type ThemePreference = "light" | "dark" | "system"
export type Density = "comfortable" | "compact"

export interface AppearanceSettings {
  theme: ThemePreference
  density: Density
}

/**
 * All persisted settings. The "integrations" section has no entry here: its
 * data is owned by IntegrationService so connection state has one source.
 */
export interface Settings {
  general: GeneralSettings
  meetings: MeetingSettings
  capture: CaptureSettings
  sharing: SharingSettings
  ai: AiSettings
  notifications: NotificationSettings
  security: SecuritySettings
  appearance: AppearanceSettings
}

export type SettingsDataSection = keyof Settings

/** Editable fields per section (read-only / server-owned fields removed). */
export interface SettingsPatchMap {
  general: Partial<Omit<GeneralSettings, "email">>
  meetings: Partial<MeetingSettings>
  capture: Partial<Omit<CaptureSettings, "manualCapture">>
  sharing: Partial<Omit<SharingSettings, "linkSharingAvailable">>
  ai: Partial<AiSettings>
  notifications: Partial<Omit<NotificationSettings, "channels">> & {
    channels?: Partial<NotificationSettings["channels"]>
  }
  security: Partial<Pick<SecuritySettings, "recordingRetentionDays">>
  appearance: Partial<AppearanceSettings>
}

export type UpdateSettingsInput = {
  [S in SettingsDataSection]: { section: S; patch: SettingsPatchMap[S] }
}[SettingsDataSection]
