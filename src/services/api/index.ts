import type { ServiceFactories } from "../registry"

import { ApiAuthService } from "./auth-service"

/*
 * Api* implementations, added service by service as the backend lands
 * (docs/backend/09-demo-slice-free-stack.md section 5). A service selected
 * for api mode without an entry here throws `service_unavailable` from the
 * registry instead of falling back to its mock.
 */
export const apiServiceFactories: Partial<ServiceFactories> = {
  auth: () => new ApiAuthService(),
}

export { ApiAuthService }
