import type {
  OnboardingData,
  OnboardingProgress,
  Settings,
} from "@/types"
import { ONBOARDING_DEFAULTS } from "@/types"

import { atDay, MOCK_TIMEZONE } from "./anchor"
import { currentUser } from "./people"

/** Privacy-first defaults: manual capture, notes visible only to the user. */
export const settings: Settings = {
  general: {
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    email: currentUser.email,
    timezone: MOCK_TIMEZONE,
    jobFunction: "engineering",
    emailType: "company",
  },
  meetings: {
    defaultSharing: "only_me",
    meetingFocus: ["decisions", "action_items", "questions", "risks", "deadlines"],
  },
  capture: {
    manualCapture: true,
    capturePreference: "manual",
    defaultCaptureMode: "audio",
    confirmBeforeCapture: true,
  },
  sharing: {
    linkSharingAvailable: false,
    includeTranscriptWhenSharing: true,
    includeRecordingWhenSharing: false,
    allowRecipientsToReshare: false,
  },
  ai: {
    priorities: ["decisions", "action_items", "questions", "risks", "deadlines"],
    summaryLength: "standard",
    personalizeByJobFunction: true,
    showSuggestedQuestions: true,
  },
  notifications: {
    processingCompleted: true,
    actionItemReminders: true,
    mentions: true,
    sharedMeetings: true,
    dealUpdates: false,
    weeklySummary: true,
    channels: { inApp: true, email: false },
  },
  security: {
    signInMethod: "google",
    sessions: [
      {
        id: "sess_current",
        device: "Linux laptop",
        browser: "Firefox",
        location: "Lahore, Pakistan",
        lastActiveAt: atDay(0, "09:28"),
        isCurrent: true,
      },
      {
        id: "sess_phone",
        device: "Android phone",
        browser: "Chrome",
        location: "Lahore, Pakistan",
        lastActiveAt: atDay(-1, "21:14"),
        isCurrent: false,
      },
      {
        id: "sess_mac",
        device: "MacBook Pro",
        browser: "Safari",
        location: "Karachi, Pakistan",
        lastActiveAt: atDay(-6, "17:02"),
        isCurrent: false,
      },
    ],
    recordingRetentionDays: 90,
  },
  appearance: { theme: "system", density: "comfortable" },
}

/** Values prefilled in onboarding before the user answers anything. */
export const onboardingDefaults: Partial<OnboardingData> = {
  ...ONBOARDING_DEFAULTS,
  meetingFocus: [...ONBOARDING_DEFAULTS.meetingFocus],
  selectedMeetingCategories: [],
  goals: [],
  firstName: currentUser.firstName,
  lastName: currentUser.lastName,
  timezone: MOCK_TIMEZONE,
}

/** A fresh onboarding session, right after first Google sign-in. */
export const onboardingProgressInitial: OnboardingProgress = {
  currentStep: "email_type",
  completedSteps: [],
  skippedSteps: [],
  data: onboardingDefaults,
  completed: false,
  updatedAt: atDay(0, "09:30"),
}

/** Completed answers for the demo account, used by the onboarding completion screen. */
export const onboardingCompletedData: OnboardingData = {
  emailType: "company",
  calendarConnected: true,
  capturePreference: "manual",
  selectedMeetingCategories: [],
  sharingPreference: "only_me",
  meetingFocus: ["decisions", "action_items", "questions"],
  jobFunction: "engineering",
  firstName: currentUser.firstName,
  lastName: currentUser.lastName,
  timezone: MOCK_TIMEZONE,
  goals: ["remember_decisions", "track_action_items", "search_past_meetings"],
  zoomConnected: true,
}
