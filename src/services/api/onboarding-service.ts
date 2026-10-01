import { apiClient } from "@/lib/api/client"
import { refreshSessionClaims } from "@/lib/supabase/client"
import type { OnboardingService } from "@/services/interfaces"
import type { OnboardingData, OnboardingProgress, SaveOnboardingStepInput, User } from "@/types"

/* docs/backend/04-api-spec.md 5.3 */
export class ApiOnboardingService implements OnboardingService {
  getProgress(): Promise<OnboardingProgress> {
    return apiClient.get<OnboardingProgress>("/v1/onboarding")
  }

  saveStep(input: SaveOnboardingStepInput): Promise<OnboardingProgress> {
    const body: { data: SaveOnboardingStepInput["data"]; skipped?: boolean } = { data: input.data }
    if (input.skipped) body.skipped = true
    return apiClient.put<OnboardingProgress>(`/v1/onboarding/steps/${input.step}`, body)
  }

  async complete(data: OnboardingData): Promise<User> {
    const user = await apiClient.post<User>("/v1/onboarding/complete", data)
    // The proxy reads `app_stage` from the JWT, which says "onboarding" until
    // the token is re-minted. Onboarding is already complete server-side, so a
    // failed refresh (retried once) must not fail it; the completion screen
    // refreshes again before navigating.
    await refreshSessionClaims().catch(() => refreshSessionClaims().catch(() => undefined))
    return user
  }
}
