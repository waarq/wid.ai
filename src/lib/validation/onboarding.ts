import { z } from "zod"

import {
  CAPTURE_PREFERENCES,
  EMAIL_TYPES,
  JOB_FUNCTIONS,
  MEETING_CATEGORIES,
  MEETING_FOCUS_OPTIONS,
  ONBOARDING_GOALS,
  SHARING_PREFERENCES,
} from "@/types"

/*
 * Zod schemas for every onboarding step. Each schema mirrors the slice of
 * OnboardingData the step owns (OnboardingStepData), so a parsed value can be
 * sent to `services.onboarding.saveStep` as-is.
 */

export const emailTypeStepSchema = z.object({
  emailType: z.enum(EMAIL_TYPES, {
    required_error: "Choose the email you signed in with.",
    invalid_type_error: "Choose the email you signed in with.",
  }),
})

export const calendarStepSchema = z.object({
  calendarConnected: z.boolean(),
})

export const captureStepSchema = z
  .object({
    capturePreference: z.enum(CAPTURE_PREFERENCES),
    selectedMeetingCategories: z.array(z.enum(MEETING_CATEGORIES)),
  })
  .superRefine((value, ctx) => {
    if (value.capturePreference === "selected_meetings" && value.selectedMeetingCategories.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedMeetingCategories"],
        message: "Choose at least one type of meeting, or pick another option.",
      })
    }
  })
  // Categories only mean something for "selected_meetings".
  .transform((value) => ({
    capturePreference: value.capturePreference,
    selectedMeetingCategories:
      value.capturePreference === "selected_meetings" ? value.selectedMeetingCategories : [],
  }))

export const sharingStepSchema = z.object({
  sharingPreference: z.enum(SHARING_PREFERENCES),
})

export const focusStepSchema = z.object({
  meetingFocus: z
    .array(z.enum(MEETING_FOCUS_OPTIONS))
    .min(1, "Choose at least one thing for WIT to pay attention to."),
})

export const jobFunctionStepSchema = z.object({
  jobFunction: z.enum(JOB_FUNCTIONS, {
    required_error: "Choose the option that fits best. Other is fine.",
    invalid_type_error: "Choose the option that fits best. Other is fine.",
  }),
})

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

const nameField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(50, `Keep your ${label} under 50 characters.`)

export const personalizeStepSchema = z.object({
  firstName: nameField("first name"),
  lastName: nameField("last name"),
  timezone: z
    .string()
    .min(1, "Choose your timezone.")
    .refine(isValidTimeZone, "Choose a timezone from the list."),
  goals: z.array(z.enum(ONBOARDING_GOALS)),
})
export type PersonalizeFormValues = z.input<typeof personalizeStepSchema>

export const zoomStepSchema = z.object({
  zoomConnected: z.boolean(),
})

/** First user-facing message of a failed parse, for inline step errors. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check your answer and try again."
}
