import type { ISODateString } from "./common"

export type CalendarProvider = "google_calendar" | "microsoft_calendar"

export type ConferenceProvider =
  | "zoom"
  | "google_meet"
  | "microsoft_teams"
  | "in_person"
  | "other"

/** Read-only scopes WID requests. Shown in the permission explainer before OAuth. */
export const CALENDAR_SCOPES = [
  "events.read",
  "titles.read",
  "times.read",
  "attendees.read",
] as const
export type CalendarScope = (typeof CALENDAR_SCOPES)[number]

export interface CalendarConnection {
  provider: CalendarProvider
  status: "connected" | "disconnected"
  accountEmail?: string
  connectedAt?: ISODateString
  lastSyncedAt?: ISODateString
  /** Count of upcoming events found ("12 upcoming meetings found"). */
  upcomingEventCount: number
  scopes: CalendarScope[]
  /**
   * Set by redirect-based OAuth implementations after `connect()`.
   * When present, the UI navigates here to complete the consent flow.
   */
  authorizationUrl?: string
}

export type AttendeeResponse = "accepted" | "declined" | "tentative" | "needs_action"

export interface CalendarAttendee {
  name: string
  email: string
  response: AttendeeResponse
  isOrganizer: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  startsAt: ISODateString
  endsAt: ISODateString
  attendees: CalendarAttendee[]
  conference?: {
    provider: ConferenceProvider
    joinUrl?: string
  }
  isRecurring: boolean
  /** Set once the user has captured this event. Never set automatically. */
  meetingId?: string
}

export interface CalendarEventParams {
  /** Inclusive lower bound. Defaults to now. */
  from?: ISODateString
  /** Exclusive upper bound. */
  to?: ISODateString
  limit?: number
  /** Include events that already have a captured meeting. Default true. */
  includeCaptured?: boolean
}
