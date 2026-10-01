"use client"

import { useState } from "react"

import { CalendarConnect } from "@/components/integrations/calendar-connect"

import { OnboardingQuestion } from "../onboarding-question"
import type { StepProps } from "./types"

/* Step 1: calendar. Connecting is optional; skipping explains what you lose. */
export function CalendarStep(props: StepProps) {
  const [connected, setConnected] = useState<boolean>(props.draft.calendarConnected ?? false)

  return (
    <OnboardingQuestion
      pending={props.pending}
      error={props.error}
      onRetry={props.onRetry}
      onBack={props.onBack}
      focusHeading={props.focusHeading}
      title={connected ? "Your calendar is ready" : "Connect your calendar"}
      description="WIT uses your calendar to understand which meetings you have coming up. WIT will not automatically record your meetings. You choose when to capture."
      hideContinue={!connected}
      onSubmit={() => props.onSave({ step: "calendar", data: { calendarConnected: true } })}
      onSkip={connected ? undefined : () => props.onSave({ step: "calendar", data: { calendarConnected: false }, skipped: true })}
      footerNote={
        connected ? null : (
          <>
            Without a calendar, WIT can&apos;t show upcoming meetings, titles or attendees, so you&apos;ll name each
            capture yourself. You can connect later in Settings.
          </>
        )
      }
    >
      <CalendarConnect context="onboarding" onStatusChange={(isConnected) => setConnected(isConnected)} />
    </OnboardingQuestion>
  )
}
