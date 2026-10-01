"use client"

import { Info } from "lucide-react"
import { useId, useState } from "react"

import { useProfile } from "@/hooks"
import {
  captureStepSchema,
  emailTypeStepSchema,
  firstIssueMessage,
  focusStepSchema,
  jobFunctionStepSchema,
  sharingStepSchema,
} from "@/lib/validation/onboarding"
import {
  ONBOARDING_DEFAULTS,
  type CapturePreference,
  type EmailType,
  type JobFunction,
  type MeetingCategory,
  type MeetingFocus,
  type SharingPreference,
} from "@/types"

import { OnboardingQuestion } from "../onboarding-question"
import {
  CapturePreferenceSelector,
  EmailTypeSelector,
  JobFunctionSelector,
  MeetingFocusSelector,
  SharingSelector,
} from "../selectors"
import type { StepProps } from "./types"

function common(props: StepProps) {
  return {
    pending: props.pending,
    error: props.error,
    onRetry: props.onRetry,
    onBack: props.onBack,
    focusHeading: props.focusHeading,
  }
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-3 text-sm text-destructive">
      {message}
    </p>
  )
}

/* ---------- Getting started: email type ---------- */

export function EmailTypeStep(props: StepProps) {
  const titleId = useId()
  const errorId = useId()
  const profile = useProfile()
  const [value, setValue] = useState<EmailType | undefined>(props.draft.emailType)
  const [invalid, setInvalid] = useState<string | null>(null)
  const firstName = profile.data?.firstName

  function submit() {
    const parsed = emailTypeStepSchema.safeParse({ emailType: value })
    if (!parsed.success) return setInvalid(firstIssueMessage(parsed.error))
    props.onSave({ step: "email_type", data: parsed.data })
  }

  return (
    <OnboardingQuestion
      {...common(props)}
      titleId={titleId}
      eyebrow={firstName ? `Welcome, ${firstName}. Let's set up WIT.` : "Let's set up WIT."}
      title="How will you use WIT?"
      description="Which email did you use to sign in? This shapes your setup and account. We ask rather than guess from your email address."
      onSubmit={submit}
    >
      <EmailTypeSelector
        value={value}
        onChange={(next) => {
          setValue(next)
          setInvalid(null)
        }}
        labelledBy={titleId}
        describedBy={invalid ? errorId : undefined}
        invalid={Boolean(invalid)}
        disabled={props.pending !== null}
      />
      <FieldError id={errorId} message={invalid} />
    </OnboardingQuestion>
  )
}

/* ---------- 2: capture preference ---------- */

export function CaptureStep(props: StepProps) {
  const titleId = useId()
  const [preference, setPreference] = useState<CapturePreference>(
    props.draft.capturePreference ?? ONBOARDING_DEFAULTS.capturePreference,
  )
  const [categories, setCategories] = useState<MeetingCategory[]>(props.draft.selectedMeetingCategories ?? [])
  const [invalid, setInvalid] = useState<string | null>(null)

  function submit() {
    const parsed = captureStepSchema.safeParse({ capturePreference: preference, selectedMeetingCategories: categories })
    if (!parsed.success) return setInvalid(firstIssueMessage(parsed.error))
    props.onSave({ step: "capture", data: parsed.data })
  }

  return (
    <OnboardingQuestion
      {...common(props)}
      titleId={titleId}
      title="Which meetings should WIT take notes on?"
      description={
        <p className="grid grid-cols-[auto_1fr] items-start gap-2.5">
          <Info aria-hidden className="mt-1 size-4 text-primary" />
          <span>
            Your calendar helps WIT understand your schedule. It does not mean WIT automatically records your
            meetings. Whatever you pick, you start every capture yourself.
          </span>
        </p>
      }
      onSubmit={submit}
    >
      <CapturePreferenceSelector
        value={preference}
        onChange={(next) => {
          setPreference(next)
          setInvalid(null)
        }}
        categories={categories}
        onCategoriesChange={(next) => {
          setCategories(next)
          setInvalid(null)
        }}
        categoriesError={invalid ?? undefined}
        labelledBy={titleId}
        disabled={props.pending !== null}
      />
    </OnboardingQuestion>
  )
}

/* ---------- 3: sharing ---------- */

export function SharingStep(props: StepProps) {
  const titleId = useId()
  const [value, setValue] = useState<SharingPreference>(
    props.draft.sharingPreference ?? ONBOARDING_DEFAULTS.sharingPreference,
  )

  function submit() {
    const parsed = sharingStepSchema.safeParse({ sharingPreference: value })
    if (parsed.success) props.onSave({ step: "sharing", data: parsed.data })
  }

  return (
    <OnboardingQuestion
      {...common(props)}
      titleId={titleId}
      title="Who should meeting notes be shared with?"
      description="This is your default. You can change who sees any meeting at any time, and every meeting always shows who can see it."
      onSubmit={submit}
    >
      <SharingSelector
        value={value}
        onChange={setValue}
        labelledBy={titleId}
        disabled={props.pending !== null}
      />
    </OnboardingQuestion>
  )
}

/* ---------- 4: understanding focus ---------- */

export function FocusStep(props: StepProps) {
  const titleId = useId()
  const errorId = useId()
  const [value, setValue] = useState<MeetingFocus[]>(props.draft.meetingFocus ?? [...ONBOARDING_DEFAULTS.meetingFocus])
  const [invalid, setInvalid] = useState<string | null>(null)

  function submit() {
    const parsed = focusStepSchema.safeParse({ meetingFocus: value })
    if (!parsed.success) return setInvalid(firstIssueMessage(parsed.error))
    props.onSave({ step: "focus", data: parsed.data })
  }

  return (
    <OnboardingQuestion
      {...common(props)}
      titleId={titleId}
      title="What should WIT pay attention to?"
      description={
        <>
          Choose as many as you like. WIT highlights these in every meeting brief.{" "}
          <span className="text-foreground">You can change these later.</span>
        </>
      }
      onSubmit={submit}
    >
      <MeetingFocusSelector
        value={value}
        onChange={(next) => {
          setValue(next)
          setInvalid(null)
        }}
        labelledBy={titleId}
        describedBy={invalid ? errorId : undefined}
        invalid={Boolean(invalid)}
        disabled={props.pending !== null}
      />
      <div className="mt-3 flex items-center justify-between gap-4">
        <FieldError id={errorId} message={invalid} />
        <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          <span className="num">{value.length}</span> selected
        </p>
      </div>
    </OnboardingQuestion>
  )
}

/* ---------- 5: job function ---------- */

export function JobFunctionStep(props: StepProps) {
  const titleId = useId()
  const errorId = useId()
  const [value, setValue] = useState<JobFunction | undefined>(props.draft.jobFunction)
  const [invalid, setInvalid] = useState<string | null>(null)

  function submit() {
    const parsed = jobFunctionStepSchema.safeParse({ jobFunction: value })
    if (!parsed.success) return setInvalid(firstIssueMessage(parsed.error))
    props.onSave({ step: "job_function", data: parsed.data })
  }

  return (
    <OnboardingQuestion
      {...common(props)}
      titleId={titleId}
      title="What best describes your job function?"
      description="WIT uses this to decide what to surface first: your dashboard, summary emphasis, action items and suggested questions."
      onSubmit={submit}
    >
      <JobFunctionSelector
        value={value}
        onChange={(next) => {
          setValue(next)
          setInvalid(null)
        }}
        labelledBy={titleId}
        describedBy={invalid ? errorId : undefined}
        invalid={Boolean(invalid)}
        disabled={props.pending !== null}
      />
      <FieldError id={errorId} message={invalid} />
    </OnboardingQuestion>
  )
}
