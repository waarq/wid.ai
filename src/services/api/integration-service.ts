import { apiClient } from "@/lib/api/client"
import { currentReturnTo } from "@/lib/api/return-to"
import type { IntegrationService } from "@/services/interfaces"
import type { Integration, IntegrationOf, IntegrationProvider, IntegrationSettingsMap } from "@/types"

/*
 * docs/backend/04-api-spec.md 5.14. `connect` sends the current path as
 * `returnTo`; the backend OAuth callback redirects back to it with
 * `?integration=<provider>&result=connected|error` (see lib/integrations/oauth-return.ts).
 */
export class ApiIntegrationService implements IntegrationService {
  list(): Promise<Integration[]> {
    return apiClient.get<Integration[]>("/v1/integrations")
  }

  get<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>> {
    return apiClient.get<IntegrationOf<P>>(`/v1/integrations/${provider}`)
  }

  connect<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>> {
    return apiClient.post<IntegrationOf<P>>(`/v1/integrations/${provider}/connect`, { returnTo: currentReturnTo() })
  }

  disconnect<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>> {
    return apiClient.post<IntegrationOf<P>>(`/v1/integrations/${provider}/disconnect`)
  }

  configure<P extends IntegrationProvider>(
    provider: P,
    settings: Partial<IntegrationSettingsMap[P]>,
  ): Promise<IntegrationOf<P>> {
    return apiClient.patch<IntegrationOf<P>>(`/v1/integrations/${provider}/settings`, settings)
  }
}
