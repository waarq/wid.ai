import type { ISODateString } from "./common"
import type { EmailType, JobFunction } from "./user"

export const CAPTURE_PREFERENCES = [
  "all_calendar_meetings",
  "selected_meetings",
  "manual",
] as const
/**
 * Which meetings WID makes available for capture. None of these values ever
 * means automatic recording: capture is always started by the user.
 * Default: "manual".
 */
export type CapturePreference = (typeof CAPTURE_PREFERENCES)[number]

export const MEETING_CATEGORIES = [
  "internal",
  "external",
  "one_on_one",
  "recurring",
  "customer",
] as const
/** Meeting types the user can opt into when choosing "selected_meetings". */
export type MeetingCategory = (typeof MEETING_CATEGORIES)[number]

export const SHARING_PREFERENCES = ["all_attendees", "only_me"] as const
/** Default: "only_me" (privacy is the safer initial state). */
export type SharingPreference = (typeof SHARING_PREFERENCES)[number]

export const MEETING_FOCUS_OPTIONS = [
  "decisions",
  "action_items",
  "questions",
  "risks",
  "customer_requirements",
  "commitments",
  "deadlines",
  "quotes",
  "sales_opportunities",
] as const
/** What WID should pay attention to when understanding a meeting. */
export type MeetingFocus = (typeof MEETING_FOCUS_OPTIONS)[number]

export const ONBOARDING_GOALS = [
  "remember_decisions",
  "track_action_items",
  "prepare_follow_ups",
  "understand_customer_conversations",
  "search_past_meetings",
  "keep_team_aligned",
] as const
/** "What do you want WID to help you with?" (personalisation step). */
export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number]

/** Complete onboarding payload. Maps 1:1 to the backend onboarding request. */
export interface OnboardingData {
  emailType: EmailType
  calendarConnected: boolean
  capturePreference: CapturePreference
  /** Only meaningful when capturePreference is "selected_meetings". */
  selectedMeetingCategories: MeetingCategory[]
  sharingPreference: SharingPreference
  meetingFocus: MeetingFocus[]
  jobFunction: JobFunction
  firstName: string
  lastName: string
  timezone: string
  goals: OnboardingGoal[]
  zoomConnected: boolean
}

export const ONBOARDING_STEPS = [
  "email_type",
  "calendar",
  "capture",
  "sharing",
  "focus",
  "job_function",
  "personalize",
  "zoom",
] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

/** The slice of OnboardingData each step is responsible for. */
export interface OnboardingStepData {
  email_type: Pick<OnboardingData, "emailType">
  calendar: Pick<OnboardingData, "calendarConnected">
  capture: Pick<OnboardingData, "capturePreference" | "selectedMeetingCategories">
  sharing: Pick<OnboardingData, "sharingPreference">
  focus: Pick<OnboardingData, "meetingFocus">
  job_function: Pick<OnboardingData, "jobFunction">
  personalize: Pick<OnboardingData, "firstName" | "lastName" | "timezone" | "goals">
  zoom: Pick<OnboardingData, "zoomConnected">
}

/** Discriminated by `step`, so each step can only submit its own fields. */
export type SaveOnboardingStepInput = {
  [S in OnboardingStep]: { step: S; data: OnboardingStepData[S]; skipped?: boolean }
}[OnboardingStep]

/** Persisted progress. Enables back/continue and refresh recovery. */
export interface OnboardingProgress {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  skippedSteps: OnboardingStep[]
  data: Partial<OnboardingData>
  completed: boolean
  updatedAt: ISODateString
}

/** Defaults applied before the user answers anything. */
export const ONBOARDING_DEFAULTS = {
  capturePreference: "manual",
  sharingPreference: "only_me",
  selectedMeetingCategories: [],
  meetingFocus: ["decisions", "action_items", "questions"],
  goals: [],
  calendarConnected: false,
  zoomConnected: false,
} as const satisfies Partial<OnboardingData>
