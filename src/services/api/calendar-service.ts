import { apiClient } from "@/lib/api/client"
import { currentReturnTo } from "@/lib/api/return-to"
import type { CalendarService } from "@/services/interfaces"
import type { CalendarConnection, CalendarEvent, CalendarEventParams } from "@/types"

/* docs/backend/04-api-spec.md 5.4 */
export class ApiCalendarService implements CalendarService {
  getConnection(): Promise<CalendarConnection> {
    return apiClient.get<CalendarConnection>("/v1/calendar/connection")
  }

  connect(): Promise<CalendarConnection> {
    return apiClient.post<CalendarConnection>("/v1/calendar/connect", { returnTo: currentReturnTo() })
  }

  async disconnect(): Promise<void> {
    await apiClient.delete<void>("/v1/calendar/connection")
  }

  listEvents(params: CalendarEventParams = {}): Promise<CalendarEvent[]> {
    return apiClient.get<CalendarEvent[]>("/v1/calendar/events", {
      query: {
        from: params.from,
        to: params.to,
        limit: params.limit,
        includeCaptured: params.includeCaptured,
      },
    })
  }
}
