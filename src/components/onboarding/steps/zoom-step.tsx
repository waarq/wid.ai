"use client"

import { useState } from "react"

import { ZoomConnect } from "@/components/integrations/zoom-connect"

import { OnboardingQuestion } from "../onboarding-question"
import type { StepProps } from "./types"

/* Optional final step. Never forced: a small text link skips it. */
export function ZoomStep(props: StepProps) {
  const [connected, setConnected] = useState<boolean>(props.draft.zoomConnected ?? false)
  const busy = props.pending !== null

  return (
    <OnboardingQuestion
      pending={props.pending}
      error={props.error}
      onRetry={props.onRetry}
      onBack={props.onBack}
      focusHeading={props.focusHeading}
      title="Connect Zoom"
      description="WID requires a Zoom connection to capture Zoom meetings. Google Meet and in-person meetings work without it."
      hideContinue={!connected}
      continueLabel="Finish setup"
      onSubmit={() => props.onSave({ step: "zoom", data: { zoomConnected: true } })}
      footerNote={
        connected ? null : (
          <button
            type="button"
            disabled={busy}
            onClick={() => props.onSave({ step: "zoom", data: { zoomConnected: false }, skipped: true })}
            className="rounded-sm text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:opacity-70 disabled:opacity-50"
          >
            {props.pending === "skip" ? "Finishing setup…" : "Never join Zoom meetings? Skip this step."}
          </button>
        )
      }
    >
      <ZoomConnect context="onboarding" onStatusChange={setConnected} />
    </OnboardingQuestion>
  )
}
