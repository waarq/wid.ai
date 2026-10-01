import { AppException } from "@/lib/utils/errors"
import type { SettingsService } from "@/services/interfaces"
import {
  CAPTURE_MODES,
  CAPTURE_PREFERENCES,
  MEETING_FOCUS_OPTIONS,
  SETTINGS_SECTIONS,
  SHARING_PREFERENCES,
  type Settings,
  type UpdateSettingsInput,
} from "@/types"

import type { MockDb } from "./db"
import { mockCall, mockWrite } from "./runtime"
import { applyProfile } from "./user-service"

/*
 * Settings are one document patched per section. "general" mirrors the
 * profile (both write through applyProfile). Read-only fields (email,
 * manualCapture, linkSharingAvailable) are ignored if sent.
 */

type FieldErrors = Record<string, string[]>

function oneOf(errors: FieldErrors, key: string, allowed: readonly unknown[], value: unknown): void {
  if (value !== undefined && !allowed.includes(value)) errors[key] = ["Choose one of the options."]
}

function bool(errors: FieldErrors, key: string, value: unknown): void {
  if (value !== undefined && typeof value !== "boolean") errors[key] = ["Must be on or off."]
}

function focusList(errors: FieldErrors, key: string, value: unknown): void {
  if (value === undefined) return
  if (!Array.isArray(value) || !value.every((v) => (MEETING_FOCUS_OPTIONS as readonly unknown[]).includes(v))) {
    errors[key] = ["Unknown focus option."]
  }
}

function current(db: MockDb): Settings {
  const { user, settings } = db.state
  settings.general = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    timezone: user.timezone,
    jobFunction: user.jobFunction,
    emailType: user.emailType,
  }
  return settings
}

function pick<T extends object>(patch: T, blocked: readonly string[]): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([k, v]) => !blocked.includes(k) && v !== undefined)) as Partial<T>
}

export class MockSettingsService implements SettingsService {
  get(): Promise<Settings> {
    return mockCall("settings.get", (db) => current(db))
  }

  update(input: UpdateSettingsInput): Promise<Settings> {
    return mockWrite("settings.update", (db) => {
      if (!(SETTINGS_SECTIONS as readonly string[]).includes(input.section) || input.section === ("integrations" as string)) {
        throw new AppException("validation_error", { details: { fieldErrors: { section: ["Unknown settings section."] } } })
      }
      const settings = current(db)
      const errors: FieldErrors = {}

      switch (input.section) {
        case "general": {
          const { email: _ignored, ...patch } = input.patch as typeof input.patch & { email?: string }
          void _ignored
          applyProfile(db, {
            firstName: patch.firstName,
            lastName: patch.lastName,
            timezone: patch.timezone,
            jobFunction: patch.jobFunction ?? undefined,
            emailType: patch.emailType ?? undefined,
          })
          break
        }
        case "meetings": {
          oneOf(errors, "defaultSharing", SHARING_PREFERENCES, input.patch.defaultSharing)
          focusList(errors, "meetingFocus", input.patch.meetingFocus)
          if (Object.keys(errors).length === 0) settings.meetings = { ...settings.meetings, ...pick(input.patch, []) }
          break
        }
        case "capture": {
          oneOf(errors, "capturePreference", CAPTURE_PREFERENCES, input.patch.capturePreference)
          oneOf(errors, "defaultCaptureMode", CAPTURE_MODES, input.patch.defaultCaptureMode)
          bool(errors, "confirmBeforeCapture", input.patch.confirmBeforeCapture)
          // manualCapture is a product rule and stays `true`.
          if (Object.keys(errors).length === 0) {
            settings.capture = { ...settings.capture, ...pick(input.patch, ["manualCapture"]), manualCapture: true }
          }
          break
        }
        case "sharing": {
          for (const key of ["includeTranscriptWhenSharing", "includeRecordingWhenSharing", "allowRecipientsToReshare"] as const) {
            bool(errors, key, input.patch[key])
          }
          if (Object.keys(errors).length === 0) {
            settings.sharing = { ...settings.sharing, ...pick(input.patch, ["linkSharingAvailable"]) }
          }
          break
        }
        case "ai": {
          focusList(errors, "priorities", input.patch.priorities)
          oneOf(errors, "summaryLength", ["brief", "standard", "detailed"], input.patch.summaryLength)
          bool(errors, "personalizeByJobFunction", input.patch.personalizeByJobFunction)
          bool(errors, "showSuggestedQuestions", input.patch.showSuggestedQuestions)
          if (Object.keys(errors).length === 0) settings.ai = { ...settings.ai, ...pick(input.patch, []) }
          break
        }
        case "notifications": {
          const { channels, ...flags } = input.patch
          for (const [key, value] of Object.entries(flags)) bool(errors, key, value)
          if (channels) for (const [key, value] of Object.entries(channels)) bool(errors, `channels.${key}`, value)
          if (Object.keys(errors).length === 0) {
            settings.notifications = {
              ...settings.notifications,
              ...pick(flags, []),
              channels: { ...settings.notifications.channels, ...(channels ? pick(channels, []) : {}) },
            }
          }
          break
        }
        case "security": {
          const days = input.patch.recordingRetentionDays
          if (days !== undefined && days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) {
            errors.recordingRetentionDays = ["Choose between 1 and 3650 days, or keep until deleted."]
          }
          if (Object.keys(errors).length === 0 && days !== undefined) settings.security = { ...settings.security, recordingRetentionDays: days }
          break
        }
        case "appearance": {
          oneOf(errors, "theme", ["light", "dark", "system"], input.patch.theme)
          oneOf(errors, "density", ["comfortable", "compact"], input.patch.density)
          if (Object.keys(errors).length === 0) settings.appearance = { ...settings.appearance, ...pick(input.patch, []) }
          break
        }
      }

      if (Object.keys(errors).length > 0) throw new AppException("validation_error", { details: { fieldErrors: errors } })
      return current(db)
    })
  }

  revokeSession(sessionId: string): Promise<Settings> {
    return mockWrite("settings.revokeSession", (db) => {
      const settings = current(db)
      const session = settings.security.sessions.find((s) => s.id === sessionId)
      if (!session) throw new AppException("not_found", { message: "That session has already ended." })
      if (session.isCurrent) {
        throw new AppException("forbidden", { message: "This is the device you're using. Use Sign out instead." })
      }
      settings.security = { ...settings.security, sessions: settings.security.sessions.filter((s) => s.id !== sessionId) }
      return current(db)
    })
  }
}
