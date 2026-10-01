import type {
  AttendeeResponse,
  CalendarAttendee,
  CalendarConnection,
  CalendarEvent,
  ConferenceProvider,
} from "@/types"
import { CALENDAR_SCOPES } from "@/types"

import { atDay, plusSeconds } from "./anchor"
import { personProfiles, type PersonKey } from "./people"

type AttendeeSpec = readonly [PersonKey, AttendeeResponse?]

function attendees(organizer: PersonKey, others: AttendeeSpec[]): CalendarAttendee[] {
  const toAttendee = ([key, response]: AttendeeSpec): CalendarAttendee => ({
    name: personProfiles[key].name,
    email: personProfiles[key].email,
    response: response ?? "accepted",
    isOrganizer: key === organizer,
  })
  return [toAttendee([organizer]), ...others.filter(([k]) => k !== organizer).map(toAttendee)]
}

function event(
  id: string,
  title: string,
  day: number,
  time: string,
  minutes: number,
  provider: ConferenceProvider,
  organizer: PersonKey,
  others: AttendeeSpec[],
  isRecurring = false,
): CalendarEvent {
  const startsAt = atDay(day, time)
  return {
    id,
    title,
    startsAt,
    endsAt: plusSeconds(startsAt, minutes * 60),
    attendees: attendees(organizer, others),
    conference: { provider, joinUrl: `https://meet.wid-demo.example/join/${id}` },
    isRecurring,
  }
}

/** 12 upcoming events from the anchor time. None has a captured meeting: capture is always manual. */
export const calendarEvents: CalendarEvent[] = [
  event("evt_hiring_sync", "Hiring Sync: Backend Engineer", 0, "11:00", 30, "google_meet", "ahmed", [["waleed"], ["ayesha", "tentative"]]),
  event("evt_design_review", "Design Review", 0, "14:00", 45, "zoom", "sara", [["waleed"], ["ayesha"], ["hamza", "tentative"]]),
  event("evt_atlas_checkin", "Atlas Properties: Onboarding Check-in", 0, "16:00", 30, "zoom", "ali", [["waleed"], ["bilal"]]),
  event("evt_engineering_sync", "Engineering Sync", 1, "10:00", 30, "google_meet", "ahmed", [["waleed"], ["hamza"], ["sara"]], true),
  event("evt_payments_vendor", "Vendor Review: Auth Service", 1, "11:00", 45, "zoom", "ahmed", [["waleed"], ["hamza"]]),
  event("evt_cs_weekly", "Customer Success Weekly", 1, "11:30", 30, "google_meet", "ayesha", [["waleed", "needs_action"], ["ali"]], true),
  event("evt_meridian_followup", "Meridian Freight: Proposal Follow-up", 1, "15:00", 30, "zoom", "ali", [["waleed"], ["usman", "needs_action"]]),
  event("evt_sprint_planning", "Sprint Planning", 4, "09:30", 60, "google_meet", "hamza", [["waleed"], ["ahmed"], ["ayesha"], ["sara"]], true),
  event("evt_beta_readiness", "Beta Readiness Review", 4, "14:00", 45, "zoom", "ayesha", [["waleed"], ["ahmed"], ["hamza"], ["sara"]]),
  event("evt_weekly_one_on_one", "Weekly 1:1", 5, "11:00", 25, "google_meet", "ahmed", [["waleed"]], true),
  event("evt_northstar_pricing", "Northstar Labs: Pricing Walkthrough", 6, "13:00", 40, "zoom", "ali", [["waleed"], ["fatima"]]),
  event("evt_leadership_sync", "Leadership Sync", 7, "10:00", 40, "microsoft_teams", "ahmed", [["waleed"], ["ayesha"], ["ali"]], true),
]

export const calendarConnection: CalendarConnection = {
  provider: "google_calendar",
  status: "connected",
  accountEmail: "waleed@wid-demo.com",
  connectedAt: atDay(-34, "10:20"),
  lastSyncedAt: atDay(0, "09:25"),
  upcomingEventCount: calendarEvents.length,
  scopes: [...CALENDAR_SCOPES],
}

/** State before the user connects, e.g. at the onboarding calendar step. */
export const calendarConnectionDisconnected: CalendarConnection = {
  provider: "google_calendar",
  status: "disconnected",
  upcomingEventCount: 0,
  scopes: [],
}

/** Keyed by connection state for services that toggle connect/disconnect. */
export const calendarConnectionStates = {
  connected: calendarConnection,
  disconnected: calendarConnectionDisconnected,
} as const
