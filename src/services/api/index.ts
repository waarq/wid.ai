import type { ServiceFactories } from "../registry"

import { ApiAuthService } from "./auth-service"
import { ApiCalendarService } from "./calendar-service"
import { ApiIntegrationService } from "./integration-service"
import { ApiOnboardingService } from "./onboarding-service"
import { ApiSettingsService } from "./settings-service"
import { ApiUserService } from "./user-service"

/*
 * Api* implementations, added service by service as the backend lands
 * (docs/backend/09-demo-slice-free-stack.md section 5). A service selected
 * for api mode without an entry here throws `service_unavailable` from the
 * registry instead of falling back to its mock.
 */
export const apiServiceFactories: Partial<ServiceFactories> = {
  auth: () => new ApiAuthService(),
  user: () => new ApiUserService(),
  onboarding: () => new ApiOnboardingService(),
  settings: () => new ApiSettingsService(),
  integrations: () => new ApiIntegrationService(),
  calendar: () => new ApiCalendarService(),
}

export {
  ApiAuthService,
  ApiCalendarService,
  ApiIntegrationService,
  ApiOnboardingService,
  ApiSettingsService,
  ApiUserService,
}
