import type {
  Integration,
  IntegrationOf,
  IntegrationProvider,
  IntegrationSettingsMap,
} from "@/types"

export interface IntegrationService {
  /** Every provider, including "coming_soon" ones, in display order. */
  list(): Promise<Integration[]>
  get<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>>
  /**
   * Starts a connection. Redirect-based OAuth implementations resolve with
   * `authorizationUrl` set; the UI navigates there. Rejects for "coming_soon".
   */
  connect<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>>
  disconnect<P extends IntegrationProvider>(provider: P): Promise<IntegrationOf<P>>
  configure<P extends IntegrationProvider>(
    provider: P,
    settings: Partial<IntegrationSettingsMap[P]>,
  ): Promise<IntegrationOf<P>>
}
