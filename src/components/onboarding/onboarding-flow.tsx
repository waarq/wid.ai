"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState, type ComponentType } from "react"
import { useShallow } from "zustand/react/shallow"

import { ErrorState } from "@/components/shared/error-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompleteOnboarding, useOnboardingProgress, useSaveOnboardingStep } from "@/hooks"
import { useStoreHydration } from "@/store/hydration"
import {
  getMissingOnboardingFields,
  getStepIndex,
  toOnboardingData,
  useOnboardingStore,
} from "@/store/onboarding-store"
import {
  ONBOARDING_STEPS,
  type OnboardingData,
  type OnboardingStep,
  type SaveOnboardingStepInput,
} from "@/types"

import { OnboardingComplete } from "./onboarding-complete"
import { OnboardingShell } from "./onboarding-shell"
import { STEP_META, stepPositionLabel } from "./steps-meta"
import { CalendarStep } from "./steps/calendar-step"
import { CaptureStep, EmailTypeStep, FocusStep, JobFunctionStep, SharingStep } from "./steps/choice-steps"
import { PersonalizeStep } from "./steps/personalize-step"
import type { StepProps } from "./steps/types"
import { ZoomStep } from "./steps/zoom-step"

const STEP_COMPONENTS: Record<OnboardingStep, ComponentType<StepProps>> = {
  email_type: EmailTypeStep,
  calendar: CalendarStep,
  capture: CaptureStep,
  sharing: SharingStep,
  focus: FocusStep,
  job_function: JobFunctionStep,
  personalize: PersonalizeStep,
  zoom: ZoomStep,
}

/** Which step owns each required field (to route back when one is missing). */
const FIELD_STEP: Partial<Record<keyof OnboardingData, OnboardingStep>> = {
  emailType: "email_type",
  capturePreference: "capture",
  sharingPreference: "sharing",
  jobFunction: "job_function",
  firstName: "personalize",
  lastName: "personalize",
  timezone: "personalize",
}

type Pending = { step: OnboardingStep; action: "continue" | "skip" } | null

/*
 * Orchestrates onboarding: local draft (useOnboardingStore, persisted) for
 * instant back/continue and refresh recovery, server progress
 * (services.onboarding via hooks) as the cross-device source of truth.
 * Every step is saved through the service before advancing.
 */
export function OnboardingFlow() {
  const reduceMotion = useReducedMotion()
  const hydrated = useStoreHydration(useOnboardingStore)
  const progress = useOnboardingProgress()
  const saveStep = useSaveOnboardingStep()
  const complete = useCompleteOnboarding()

  const { currentStep, completedSteps, skippedSteps, data } = useOnboardingStore(
    useShallow((s) => ({
      currentStep: s.currentStep,
      completedSteps: s.completedSteps,
      skippedSteps: s.skippedSteps,
      data: s.data,
    })),
  )
  const { next, back, goToStep, updateData, hydrateFromProgress, reset } = useOnboardingStore(
    useShallow((s) => ({
      next: s.next,
      back: s.back,
      goToStep: s.goToStep,
      updateData: s.updateData,
      hydrateFromProgress: s.hydrateFromProgress,
      reset: s.reset,
    })),
  )

  const [synced, setSynced] = useState(false)
  const didSync = useRef(false)
  const [pending, setPending] = useState<Pending>(null)
  const [stepError, setStepError] = useState<{ step: OnboardingStep; message: string } | null>(null)
  const [lastAction, setLastAction] = useState<(() => void) | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [navigated, setNavigated] = useState(false)
  const [finished, setFinished] = useState<OnboardingData | null>(null)

  // Merge server progress into the local draft once, after both are loaded.
  useEffect(() => {
    if (!hydrated || !progress.data || didSync.current) return
    didSync.current = true
    hydrateFromProgress(progress.data)
    queueMicrotask(() => setSynced(true))
  }, [hydrated, progress.data, hydrateFromProgress])

  function move(dir: 1 | -1, action: () => void) {
    setDirection(dir)
    setStepError(null)
    setNavigated(true)
    action()
  }

  function finish(payload: OnboardingData) {
    setPending({ step: "zoom", action: payload.zoomConnected ? "continue" : "skip" })
    const run = () => finish(payload)
    setLastAction(() => run)
    complete.mutate(payload, {
      onSuccess: () => {
        setFinished(payload)
        reset()
      },
      onError: (error) => setStepError({ step: "zoom", message: `We couldn't finish setting up WID. ${error.message}` }),
      onSettled: () => setPending(null),
    })
  }

  function save(input: SaveOnboardingStepInput) {
    const run = () => save(input)
    setLastAction(() => run)
    setStepError(null)
    setPending({ step: input.step, action: input.skipped ? "skip" : "continue" })
    saveStep.mutate(input, {
      onSuccess: () => {
        updateData(input.data)
        if (input.step === "zoom") {
          const draft = { ...useOnboardingStore.getState().data, ...input.data }
          const payload = toOnboardingData(draft)
          if (!payload) {
            setPending(null)
            const missing = getMissingOnboardingFields(draft)[0]
            const target = (missing && FIELD_STEP[missing]) || "email_type"
            move(-1, () => goToStep(target))
            setStepError({ step: target, message: "One answer is missing. Please check this step and continue." })
            return
          }
          finish(payload)
          return
        }
        setPending(null)
        move(1, () => next({ skipped: input.skipped }))
      },
      onError: (error) => {
        setPending(null)
        setStepError({ step: input.step, message: `Your answer wasn't saved. ${error.message}` })
      },
    })
  }

  /* ---------- completion ---------- */

  const serverCompleted = progress.data?.completed === true
  if (finished || (synced && serverCompleted)) {
    const source = finished ?? (progress.data ? toOnboardingData({ ...progress.data.data }) : null)
    if (source) {
      return (
        <OnboardingShell step={null}>
          <OnboardingComplete data={source} />
        </OnboardingShell>
      )
    }
  }

  /* ---------- loading / error ---------- */

  if (progress.isError && !progress.data) {
    return (
      <OnboardingShell step={null}>
        <ErrorState
          className="items-start text-left"
          title="We couldn't load your setup progress."
          description="Your answers so far are safe. Check your connection and try again."
          onRetry={() => progress.refetch()}
          retrying={progress.isFetching}
        />
      </OnboardingShell>
    )
  }

  if (!hydrated || !synced) {
    return (
      <OnboardingShell step={null}>
        <div className="grid gap-8" aria-busy="true" aria-label="Loading setup">
          <Skeleton className="h-3 w-24" />
          <div className="grid gap-3">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        </div>
      </OnboardingShell>
    )
  }

  /* ---------- steps ---------- */

  const currentIndex = getStepIndex(currentStep)
  const furthest = Math.max(
    currentIndex,
    ...[...completedSteps, ...skippedSteps].map((s) => Math.min(getStepIndex(s) + 1, ONBOARDING_STEPS.length - 1)),
  )
  const reachableSteps = ONBOARDING_STEPS.filter((s) => getStepIndex(s) <= furthest)
  const busy = pending !== null

  const StepComponent = STEP_COMPONENTS[currentStep]
  const stepProps: StepProps = {
    draft: data,
    pending: pending?.step === currentStep ? pending.action : null,
    error: stepError?.step === currentStep ? stepError.message : null,
    onRetry: () => lastAction?.(),
    onBack: currentIndex > 0 ? () => move(-1, back) : undefined,
    onSave: save,
    focusHeading: navigated,
  }

  return (
    <OnboardingShell
      step={currentStep}
      completedSteps={completedSteps}
      skippedSteps={skippedSteps}
      reachableSteps={reachableSteps}
      busy={busy}
      onStepSelect={(step) => move(getStepIndex(step) > currentIndex ? 1 : -1, () => goToStep(step))}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {navigated ? `${stepPositionLabel(currentStep)}. ${STEP_META[currentStep].label}.` : ""}
      </p>
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={{
            enter: (dir: 1 | -1) => ({ opacity: 0, x: reduceMotion ? 0 : 24 * dir }),
            center: { opacity: 1, x: 0 },
            exit: (dir: 1 | -1) => ({ opacity: 0, x: reduceMotion ? 0 : -16 * dir }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduceMotion ? { duration: 0.12 } : { type: "spring", stiffness: 300, damping: 30 }}
        >
          <StepComponent {...stepProps} />
        </motion.div>
      </AnimatePresence>
    </OnboardingShell>
  )
}
