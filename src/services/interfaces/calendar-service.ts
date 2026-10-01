import type { CalendarConnection, CalendarEvent, CalendarEventParams } from "@/types"

/**
 * Calendar is connected for context only. Nothing in this service starts,
 * schedules or joins a capture.
 */
export interface CalendarService {
  /** Resolves with status "disconnected" when no calendar is linked (never throws for that case). */
  getConnection(): Promise<CalendarConnection>
  /**
   * Connects Google Calendar. Redirect-based OAuth implementations resolve
   * with `authorizationUrl` set; the UI navigates there to finish consent.
   */
  connect(): Promise<CalendarConnection>
  disconnect(): Promise<void>
  listEvents(params?: CalendarEventParams): Promise<CalendarEvent[]>
}
