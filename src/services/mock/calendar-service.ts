import { startOfDay } from "date-fns"

import { AppException } from "@/lib/utils/errors"
import type { CalendarService } from "@/services/interfaces"
import { CALENDAR_SCOPES, type CalendarConnection, type CalendarEvent, type CalendarEventParams } from "@/types"

import type { MockDb } from "./db"
import { connectOp, disconnectOp } from "./integration-service"
import { mockCall, mockWrite } from "./runtime"

/*
 * Calendar is context only: nothing here starts, schedules or joins a
 * capture. Connection state comes from the google_calendar integration.
 */

function connectionOf(db: MockDb): CalendarConnection {
  const integration = db.integration("google_calendar")
  if (integration.status !== "connected") {
    return { provider: "google_calendar", status: "disconnected", upcomingEventCount: 0, scopes: [] }
  }
  const fromToday = startOfDay(new Date()).getTime()
  return {
    provider: "google_calendar",
    status: "connected",
    accountEmail: integration.accountLabel,
    connectedAt: integration.connectedAt,
    lastSyncedAt: new Date(Math.floor(Date.now() / 300_000) * 300_000).toISOString(),
    upcomingEventCount: db.state.calendarEvents.filter((e) => Date.parse(e.startsAt) >= fromToday).length,
    scopes: [...CALENDAR_SCOPES],
  }
}

function parseBound(value: string | undefined, field: string): number | undefined {
  if (value === undefined) return undefined
  const ms = Date.parse(value)
  if (Number.isNaN(ms)) throw new AppException("validation_error", { details: { fieldErrors: { [field]: ["Invalid date."] } } })
  return ms
}

export class MockCalendarService implements CalendarService {
  getConnection(): Promise<CalendarConnection> {
    return mockCall("calendar.getConnection", (db) => connectionOf(db))
  }

  connect(): Promise<CalendarConnection> {
    return mockWrite("calendar.connect", (db) => {
      connectOp(db, "google_calendar")
      return connectionOf(db)
    })
  }

  disconnect(): Promise<void> {
    return mockWrite("calendar.disconnect", (db) => {
      disconnectOp(db, "google_calendar")
    })
  }

  listEvents(params: CalendarEventParams = {}): Promise<CalendarEvent[]> {
    return mockCall("calendar.listEvents", (db) => {
      if (!db.isConnected("google_calendar")) return []
      const from = parseBound(params.from, "from") ?? Date.now()
      const to = parseBound(params.to, "to")
      const includeCaptured = params.includeCaptured ?? true
      const events = db.state.calendarEvents
        // An event that is still in progress counts as upcoming.
        .filter((e) => Date.parse(e.endsAt) > from && (to === undefined || Date.parse(e.startsAt) < to))
        .filter((e) => includeCaptured || !e.meetingId)
        .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
      return params.limit !== undefined ? events.slice(0, Math.max(0, params.limit)) : events
    })
  }
}
