import { apiClient } from "@/lib/api/client"
import type { SettingsService } from "@/services/interfaces"
import type { Settings, UpdateSettingsInput } from "@/types"

/* docs/backend/04-api-spec.md 5.15 */
export class ApiSettingsService implements SettingsService {
  get(): Promise<Settings> {
    return apiClient.get<Settings>("/v1/settings")
  }

  update(input: UpdateSettingsInput): Promise<Settings> {
    return apiClient.patch<Settings>("/v1/settings", input)
  }

  revokeSession(sessionId: string): Promise<Settings> {
    return apiClient.delete<Settings>(`/v1/settings/sessions/${encodeURIComponent(sessionId)}`)
  }
}
