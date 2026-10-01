import { setSessionHintCookie } from "@/lib/auth/client-session"
import { AppException } from "@/lib/utils/errors"
import type { OnboardingService } from "@/services/interfaces"
import {
  CAPTURE_PREFERENCES,
  MEETING_CATEGORIES,
  MEETING_FOCUS_OPTIONS,
  ONBOARDING_GOALS,
  ONBOARDING_STEPS,
  SHARING_PREFERENCES,
  type OnboardingData,
  type OnboardingProgress,
  type SaveOnboardingStepInput,
  type User,
} from "@/types"

import type { MockDb } from "./db"
import { mockCall, mockWrite } from "./runtime"
import { applyProfile } from "./user-service"
import { nowIso } from "./utils"

function withLiveConnections(db: MockDb, progress: OnboardingProgress): OnboardingProgress {
  return {
    ...progress,
    data: {
      ...progress.data,
      calendarConnected: db.isConnected("google_calendar"),
      zoomConnected: db.isConnected("zoom"),
    },
  }
}

function allIn<T extends string>(allowed: readonly T[], values: unknown): values is T[] {
  return Array.isArray(values) && values.every((v) => (allowed as readonly unknown[]).includes(v))
}

function validateComplete(data: OnboardingData): void {
  const errors: Record<string, string[]> = {}
  if (!(CAPTURE_PREFERENCES as readonly string[]).includes(data.capturePreference)) errors.capturePreference = ["Choose an option."]
  if (!(SHARING_PREFERENCES as readonly string[]).includes(data.sharingPreference)) errors.sharingPreference = ["Choose an option."]
  if (!allIn(MEETING_FOCUS_OPTIONS, data.meetingFocus)) errors.meetingFocus = ["Unknown focus option."]
  if (!allIn(MEETING_CATEGORIES, data.selectedMeetingCategories)) errors.selectedMeetingCategories = ["Unknown meeting type."]
  if (data.capturePreference === "selected_meetings" && data.selectedMeetingCategories.length === 0) {
    errors.selectedMeetingCategories = ["Choose at least one meeting type."]
  }
  if (!allIn(ONBOARDING_GOALS, data.goals)) errors.goals = ["Unknown goal."]
  if (Object.keys(errors).length > 0) throw new AppException("validation_error", { details: { fieldErrors: errors } })
}

export class MockOnboardingService implements OnboardingService {
  getProgress(): Promise<OnboardingProgress> {
    return mockCall("onboarding.getProgress", (db) => {
      db.requireSignedIn()
      return withLiveConnections(db, db.state.onboarding)
    })
  }

  saveStep(input: SaveOnboardingStepInput): Promise<OnboardingProgress> {
    return mockWrite("onboarding.saveStep", (db) => {
      db.requireSignedIn()
      const index = ONBOARDING_STEPS.indexOf(input.step)
      if (index === -1) throw new AppException("validation_error", { details: { fieldErrors: { step: ["Unknown step."] } } })
      const current = db.state.onboarding
      const completedSteps = input.skipped
        ? current.completedSteps.filter((s) => s !== input.step)
        : Array.from(new Set([...current.completedSteps, input.step]))
      const skippedSteps = input.skipped
        ? Array.from(new Set([...current.skippedSteps, input.step]))
        : current.skippedSteps.filter((s) => s !== input.step)
      db.state.onboarding = {
        ...current,
        data: { ...current.data, ...(input.skipped ? {} : input.data) },
        completedSteps,
        skippedSteps,
        currentStep: ONBOARDING_STEPS[index + 1] ?? input.step,
        updatedAt: nowIso(),
      }
      return withLiveConnections(db, db.state.onboarding)
    })
  }

  complete(data: OnboardingData): Promise<User> {
    return mockWrite("onboarding.complete", (db) => {
      db.requireSignedIn()
      validateComplete(data)
      const user = applyProfile(db, {
        firstName: data.firstName,
        lastName: data.lastName,
        timezone: data.timezone,
        jobFunction: data.jobFunction,
        emailType: data.emailType,
      })
      db.state.user = { ...user, onboardingCompleted: true }
      const { settings } = db.state
      settings.general = { ...settings.general, jobFunction: data.jobFunction, emailType: data.emailType }
      settings.meetings = { defaultSharing: data.sharingPreference, meetingFocus: [...data.meetingFocus] }
      settings.capture = { ...settings.capture, manualCapture: true, capturePreference: data.capturePreference }
      settings.ai = { ...settings.ai, priorities: [...data.meetingFocus] }
      db.state.onboarding = {
        ...db.state.onboarding,
        data: { ...data },
        completed: true,
        completedSteps: Array.from(new Set([...db.state.onboarding.completedSteps])),
        updatedAt: nowIso(),
      }
      setSessionHintCookie("ready")
      return db.state.user
    })
  }
}
