import { z } from "zod"

import { createApiClient } from "@/lib/api/client"
import { apiConfig } from "@/lib/api/config"
import { createFetchAdapter } from "@/lib/api/fetch-adapter"
import type { ApiAdapter } from "@/lib/api/types"
import type { GoogleSignInInput } from "@/types"

/*
 * `POST /v1/auth/bootstrap` (docs/backend/04-api-spec.md 5.1), called by the
 * /auth/callback route handler with the freshly exchanged access token.
 * Idempotent on the API side: creates the profile, personal org and settings
 * on first sign-in, and reports the routing stage.
 *
 * Only the fields the callback routes on are validated here; the full
 * AuthResult contract belongs to src/contracts.
 */

const bootstrapResultSchema = z.object({
  session: z.object({ stage: z.enum(["onboarding", "ready"]) }).passthrough(),
  isNewUser: z.boolean(),
})

export interface BootstrapResult {
  stage: "onboarding" | "ready"
  isNewUser: boolean
}

export interface BootstrapOptions {
  /** Absolute API base URL (see resolveApiBaseUrl). */
  apiBaseUrl: string
  accessToken: string
  intent: GoogleSignInInput["intent"]
  /** Test seam. Defaults to fetch without ambient credentials (Bearer only). */
  adapter?: ApiAdapter
}

export async function bootstrapAccount(options: BootstrapOptions): Promise<BootstrapResult> {
  const client = createApiClient({
    baseUrl: options.apiBaseUrl,
    timeoutMs: apiConfig.timeoutMs,
    adapter: options.adapter ?? createFetchAdapter({ credentials: "omit" }),
    getAuthToken: () => options.accessToken,
  })
  const result = await client.post("/v1/auth/bootstrap", { intent: options.intent }, {
    parse: (data) => bootstrapResultSchema.parse(data),
  })
  return { stage: result.session.stage, isNewUser: result.isNewUser }
}
