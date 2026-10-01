import { create } from "zustand"
import { persist } from "zustand/middleware"

import {
  CAPTURE_PREFERENCES,
  EMAIL_TYPES,
  JOB_FUNCTIONS,
  MEETING_CATEGORIES,
  MEETING_FOCUS_OPTIONS,
  ONBOARDING_DEFAULTS,
  ONBOARDING_GOALS,
  ONBOARDING_STEPS,
  SHARING_PREFERENCES,
  type OnboardingData,
  type OnboardingProgress,
  type OnboardingStep,
} from "@/types"

import { safeLocalStorage } from "./storage"

/*
 * Local onboarding draft: the current step and the answers given so far.
 * It enables instant back/continue and refresh recovery. The server copy
 * (services.onboarding, via useOnboardingProgress) remains the source of
 * truth across devices; `hydrateFromProgress` merges it in.
 *
 * Persisted to localStorage under a version. Names are deliberately NOT
 * persisted (they are personal data); after a refresh they come back from the
 * server progress. No tokens, emails or credentials ever go here.
 */

export const ONBOARDING_STORE_VERSION = 1
const STORAGE_KEY = "wit-onboarding-draft"

export type OnboardingDraft = Partial<OnboardingData>

export const ONBOARDING_DRAFT_DEFAULTS: OnboardingDraft = {
  ...ONBOARDING_DEFAULTS,
  selectedMeetingCategories: [...ONBOARDING_DEFAULTS.selectedMeetingCategories],
  meetingFocus: [...ONBOARDING_DEFAULTS.meetingFocus],
  goals: [...ONBOARDING_DEFAULTS.goals],
}

/* ---------- pure step helpers ---------- */

export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length

export function getStepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step)
}

export function getNextStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[getStepIndex(step) + 1] ?? null
}

export function getPreviousStep(step: OnboardingStep): OnboardingStep | null {
  const index = getStepIndex(step)
  return index > 0 ? ONBOARDING_STEPS[index - 1] : null
}

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === "string" && (ONBOARDING_STEPS as readonly string[]).includes(value)
}

const REQUIRED_FIELDS = [
  "emailType",
  "capturePreference",
  "sharingPreference",
  "jobFunction",
  "firstName",
  "lastName",
  "timezone",
] as const satisfies readonly (keyof OnboardingData)[]

/** Fields still missing before `services.onboarding.complete` can be called. */
export function getMissingOnboardingFields(draft: OnboardingDraft): (keyof OnboardingData)[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = draft[field]
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "")
  })
}

/** Builds the full payload, or null while required answers are missing. */
export function toOnboardingData(draft: OnboardingDraft): OnboardingData | null {
  if (getMissingOnboardingFields(draft).length > 0) return null
  const merged = { ...ONBOARDING_DRAFT_DEFAULTS, ...draft }
  return {
    emailType: merged.emailType!,
    calendarConnected: merged.calendarConnected ?? false,
    capturePreference: merged.capturePreference!,
    selectedMeetingCategories: merged.selectedMeetingCategories ?? [],
    sharingPreference: merged.sharingPreference!,
    meetingFocus: merged.meetingFocus ?? [],
    jobFunction: merged.jobFunction!,
    firstName: merged.firstName!.trim(),
    lastName: merged.lastName!.trim(),
    timezone: merged.timezone!,
    goals: merged.goals ?? [],
    zoomConnected: merged.zoomConnected ?? false,
  }
}

/* ---------- persistence guard ---------- */

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

function listOf<T extends string>(allowed: readonly T[], value: unknown): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is T => oneOf(allowed, item) !== undefined)
}

/**
 * Validates whatever came out of storage. Unknown or tampered values are
 * dropped field by field instead of crashing the onboarding flow.
 */
export function sanitizeDraft(value: unknown): OnboardingDraft {
  if (typeof value !== "object" || value === null) return { ...ONBOARDING_DRAFT_DEFAULTS }
  const raw = value as Record<string, unknown>
  const draft: OnboardingDraft = { ...ONBOARDING_DRAFT_DEFAULTS }

  const emailType = oneOf(EMAIL_TYPES, raw.emailType)
  if (emailType) draft.emailType = emailType
  const capturePreference = oneOf(CAPTURE_PREFERENCES, raw.capturePreference)
  if (capturePreference) draft.capturePreference = capturePreference
  const sharingPreference = oneOf(SHARING_PREFERENCES, raw.sharingPreference)
  if (sharingPreference) draft.sharingPreference = sharingPreference
  const jobFunction = oneOf(JOB_FUNCTIONS, raw.jobFunction)
  if (jobFunction) draft.jobFunction = jobFunction
  const categories = listOf(MEETING_CATEGORIES, raw.selectedMeetingCategories)
  if (categories) draft.selectedMeetingCategories = categories
  const focus = listOf(MEETING_FOCUS_OPTIONS, raw.meetingFocus)
  if (focus) draft.meetingFocus = focus
  const goals = listOf(ONBOARDING_GOALS, raw.goals)
  if (goals) draft.goals = goals
  if (typeof raw.timezone === "string" && raw.timezone.length <= 64) draft.timezone = raw.timezone
  if (typeof raw.calendarConnected === "boolean") draft.calendarConnected = raw.calendarConnected
  if (typeof raw.zoomConnected === "boolean") draft.zoomConnected = raw.zoomConnected
  return draft
}

/* ---------- store ---------- */

export interface OnboardingStoreState {
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  skippedSteps: OnboardingStep[]
  data: OnboardingDraft
  updatedAt: number | null

  goToStep: (step: OnboardingStep) => void
  /** Marks the current step answered (or skipped) and moves forward. */
  next: (options?: { skipped?: boolean }) => void
  back: () => void
  /** Merges answers into the draft without changing step. */
  updateData: (patch: OnboardingDraft) => void
  /** Merges server progress. Server answers win; local step wins if further along. */
  hydrateFromProgress: (progress: OnboardingProgress) => void
  reset: () => void
}

type PersistedOnboarding = Pick<
  OnboardingStoreState,
  "currentStep" | "completedSteps" | "skippedSteps" | "data" | "updatedAt"
>

const initialState: PersistedOnboarding = {
  currentStep: ONBOARDING_STEPS[0],
  completedSteps: [],
  skippedSteps: [],
  data: { ...ONBOARDING_DRAFT_DEFAULTS },
  updatedAt: null,
}

function withStep(list: OnboardingStep[], step: OnboardingStep): OnboardingStep[] {
  return list.includes(step) ? list : [...list, step]
}

function withoutStep(list: OnboardingStep[], step: OnboardingStep): OnboardingStep[] {
  return list.includes(step) ? list.filter((s) => s !== step) : list
}

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      goToStep: (step) => {
        if (get().currentStep !== step) set({ currentStep: step, updatedAt: Date.now() })
      },

      next: ({ skipped = false } = {}) => {
        const { currentStep, completedSteps, skippedSteps } = get()
        const following = getNextStep(currentStep)
        set({
          completedSteps: skipped ? withoutStep(completedSteps, currentStep) : withStep(completedSteps, currentStep),
          skippedSteps: skipped ? withStep(skippedSteps, currentStep) : withoutStep(skippedSteps, currentStep),
          currentStep: following ?? currentStep,
          updatedAt: Date.now(),
        })
      },

      back: () => {
        const previous = getPreviousStep(get().currentStep)
        if (previous) set({ currentStep: previous, updatedAt: Date.now() })
      },

      updateData: (patch) => set((state) => ({ data: { ...state.data, ...patch }, updatedAt: Date.now() })),

      hydrateFromProgress: (progress) =>
        set((state) => {
          const localIndex = getStepIndex(state.currentStep)
          const serverIndex = getStepIndex(progress.currentStep)
          return {
            data: { ...state.data, ...progress.data },
            completedSteps: Array.from(new Set([...state.completedSteps, ...progress.completedSteps])),
            skippedSteps: Array.from(new Set([...state.skippedSteps, ...progress.skippedSteps])),
            currentStep: serverIndex > localIndex ? progress.currentStep : state.currentStep,
            updatedAt: Date.now(),
          }
        }),

      reset: () => set({ ...initialState, data: { ...ONBOARDING_DRAFT_DEFAULTS } }),
    }),
    {
      name: STORAGE_KEY,
      version: ONBOARDING_STORE_VERSION,
      storage: safeLocalStorage<PersistedOnboarding>(),
      partialize: (state): PersistedOnboarding => {
        // Exclude personal names; keep only preference answers.
        const { firstName: _firstName, lastName: _lastName, ...safeData } = state.data
        void _firstName
        void _lastName
        return {
          currentStep: state.currentStep,
          completedSteps: state.completedSteps,
          skippedSteps: state.skippedSteps,
          data: safeData,
          updatedAt: state.updatedAt,
        }
      },
      // Older or unknown versions start fresh rather than resuming a stale shape.
      migrate: () => ({ ...initialState, data: { ...ONBOARDING_DRAFT_DEFAULTS } }),
      // Validate on the way in: storage is user-controlled input.
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<PersistedOnboarding>
        const steps = (list: unknown): OnboardingStep[] =>
          Array.isArray(list) ? list.filter(isOnboardingStep) : []
        return {
          ...current,
          currentStep: isOnboardingStep(raw.currentStep) ? raw.currentStep : current.currentStep,
          completedSteps: steps(raw.completedSteps),
          skippedSteps: steps(raw.skippedSteps),
          data: { ...sanitizeDraft(raw.data), firstName: current.data.firstName, lastName: current.data.lastName },
          updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : null,
        }
      },
      skipHydration: true,
    },
  ),
)

/* Selectors */

export const selectOnboardingStep = (s: OnboardingStoreState): OnboardingStep => s.currentStep
export const selectOnboardingStepIndex = (s: OnboardingStoreState): number => getStepIndex(s.currentStep)
export const selectOnboardingData = (s: OnboardingStoreState): OnboardingDraft => s.data
export const selectCanGoBack = (s: OnboardingStoreState): boolean => getPreviousStep(s.currentStep) !== null
export const selectIsLastStep = (s: OnboardingStoreState): boolean => getNextStep(s.currentStep) === null
