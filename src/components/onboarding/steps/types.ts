import type { OnboardingDraft } from "@/store/onboarding-store"
import type { SaveOnboardingStepInput } from "@/types"

/** Props every onboarding step receives from OnboardingFlow. */
export interface StepProps {
  draft: OnboardingDraft
  /** Which action is saving for this step, if any. */
  pending: "continue" | "skip" | null
  /** User-safe save error for this step. */
  error: string | null
  onRetry: () => void
  onBack?: () => void
  onSave: (input: SaveOnboardingStepInput) => void
  focusHeading: boolean
}
