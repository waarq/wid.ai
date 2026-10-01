import type { OnboardingData, OnboardingProgress, SaveOnboardingStepInput, User } from "@/types"

/**
 * Persists onboarding progress server-side so back/continue and refresh
 * recovery work across devices. Local draft state lives in useOnboardingStore.
 */
export interface OnboardingService {
  getProgress(): Promise<OnboardingProgress>
  /** Saves one step's answers (or a skip) and advances `currentStep`. */
  saveStep(input: SaveOnboardingStepInput): Promise<OnboardingProgress>
  /** Submits the full payload, marks onboarding complete and returns the updated user. */
  complete(data: OnboardingData): Promise<User>
}
