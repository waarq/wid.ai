import { ONBOARDING_STEPS, type OnboardingStep } from "@/types"

/*
 * Numbering: the PRD shows "Step N of 6". Email type is part of the sign-in
 * handoff ("Getting started") and Zoom is an optional final step, so the six
 * numbered steps are calendar, capture, sharing, focus, job function and
 * personalize.
 */

export const NUMBERED_STEP_TOTAL = 6

export interface StepMeta {
  step: OnboardingStep
  /** Rail label. */
  label: string
  /** 1-based number, or null for the unnumbered handoff / optional steps. */
  number: number | null
  /** Shown instead of "Step N of 6" for unnumbered steps. */
  badge?: string
}

export const STEP_META: Record<OnboardingStep, StepMeta> = {
  email_type: { step: "email_type", label: "How you'll use WIT", number: null, badge: "Getting started" },
  calendar: { step: "calendar", label: "Calendar", number: 1 },
  capture: { step: "capture", label: "Meeting capture", number: 2 },
  sharing: { step: "sharing", label: "Sharing", number: 3 },
  focus: { step: "focus", label: "Focus", number: 4 },
  job_function: { step: "job_function", label: "Job function", number: 5 },
  personalize: { step: "personalize", label: "Personalize", number: 6 },
  zoom: { step: "zoom", label: "Zoom", number: null, badge: "Optional" },
}

export const ORDERED_STEP_META: StepMeta[] = ONBOARDING_STEPS.map((step) => STEP_META[step])

export function stepPositionLabel(step: OnboardingStep): string {
  const meta = STEP_META[step]
  return meta.number ? `Step ${meta.number} of ${NUMBERED_STEP_TOTAL}` : (meta.badge ?? "")
}

/** 0..1 progress for the bar. Handoff = 0, personalize = 1, Zoom = 1. */
export function stepProgress(step: OnboardingStep): number {
  const meta = STEP_META[step]
  if (meta.number) return meta.number / NUMBERED_STEP_TOTAL
  return step === "zoom" ? 1 : 0
}
