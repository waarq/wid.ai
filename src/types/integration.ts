import type { CaptureMode } from "./capture"
import type { ISODateString } from "./common"

export const INTEGRATION_PROVIDERS = [
  "google",
  "google_calendar",
  "zoom",
  "slack",
  "microsoft_calendar",
  "hubspot",
  "salesforce",
] as const
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number]

/** Providers that can be connected today. The rest are shown as "Coming later". */
export const AVAILABLE_INTEGRATION_PROVIDERS = ["google", "google_calendar", "zoom"] as const
export type AvailableIntegrationProvider = (typeof AVAILABLE_INTEGRATION_PROVIDERS)[number]

export type IntegrationStatus = "connected" | "disconnected" | "coming_soon"

export type IntegrationCategory = "identity" | "calendar" | "conferencing" | "messaging" | "crm"

/** Provider-specific configuration surfaced by the "Configure" action. */
export interface IntegrationSettingsMap {
  google: Record<string, never>
  google_calendar: { syncedCalendarIds: string[]; showDeclinedEvents: boolean }
  zoom: { defaultCaptureMode: CaptureMode }
  slack: { channelId: string | null; postSummaries: boolean }
  microsoft_calendar: { syncedCalendarIds: string[]; showDeclinedEvents: boolean }
  hubspot: { syncDeals: boolean }
  salesforce: { syncDeals: boolean }
}

export interface IntegrationOf<P extends IntegrationProvider> {
  provider: P
  category: IntegrationCategory
  status: IntegrationStatus
  /** Connected account label, e.g. "waleed@wid-demo.com". */
  accountLabel?: string
  connectedAt?: ISODateString
  /** null when disconnected or not configurable. */
  settings: IntegrationSettingsMap[P] | null
  /**
   * Set by redirect-based OAuth implementations after `connect()`.
   * When present, the UI navigates here to finish consent. The frontend makes
   * no other assumption about how OAuth works.
   */
  authorizationUrl?: string
}

/** Discriminated on `provider`, so `settings` narrows with it. */
export type Integration = { [P in IntegrationProvider]: IntegrationOf<P> }[IntegrationProvider]
