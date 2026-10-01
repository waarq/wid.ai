"use client"

import { Check } from "lucide-react"
import type { ReactNode } from "react"

import { Logo } from "@/components/shared/logo"
import { cn } from "@/lib/utils"
import type { OnboardingStep } from "@/types"

import { OnboardingProgress } from "./onboarding-progress"
import { ORDERED_STEP_META } from "./steps-meta"

interface OnboardingShellProps {
  /** null renders the shell without step chrome (loading / completion). */
  step: OnboardingStep | null
  completedSteps?: readonly OnboardingStep[]
  skippedSteps?: readonly OnboardingStep[]
  /** Steps the user may jump back to from the rail. */
  reachableSteps?: readonly OnboardingStep[]
  onStepSelect?: (step: OnboardingStep) => void
  /** Disables rail navigation while a save is in flight. */
  busy?: boolean
  children: ReactNode
}

/*
 * Dedicated onboarding chrome, deliberately unlike the app shell: no sidebar
 * nav, no topbar. A calm single column with a slim step rail on desktop.
 */
export function OnboardingShell({
  step,
  completedSteps = [],
  skippedSteps = [],
  reachableSteps = [],
  onStepSelect,
  busy,
  children,
}: OnboardingShellProps) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-background">
      <header className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr] items-center gap-6 px-5 py-4 sm:px-8">
          <Logo href="/" />
          <p className="hidden justify-self-end text-xs text-muted-foreground sm:block">
            Setup takes about two minutes. You can change everything later.
          </p>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-x-16 px-5 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className={cn("hidden py-12 pr-8 lg:block", step && "border-r border-border")} aria-label="Setup steps">
          {step ? (
            <ol className="grid gap-1">
              {ORDERED_STEP_META.map((meta) => {
                const isCurrent = meta.step === step
                const isDone = completedSteps.includes(meta.step)
                const isSkipped = !isDone && skippedSteps.includes(meta.step)
                const canSelect = !isCurrent && !busy && reachableSteps.includes(meta.step) && onStepSelect
                const content = (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 place-items-center rounded-full border font-mono text-[10px] tabular-nums",
                        isCurrent && "border-primary text-primary-ink",
                        isDone && !isCurrent && "border-primary bg-primary text-primary-foreground",
                        !isCurrent && !isDone && "border-border-strong text-muted-foreground",
                      )}
                    >
                      {isDone && !isCurrent ? <Check className="size-3" strokeWidth={3} /> : (meta.number ?? "·")}
                    </span>
                    <span className="grid">
                      <span>{meta.label}</span>
                      {meta.badge && meta.step === "zoom" ? (
                        <span className="text-xs text-muted-foreground">Optional</span>
                      ) : null}
                      {isSkipped ? <span className="text-xs text-muted-foreground">Skipped</span> : null}
                    </span>
                    <span className="sr-only">
                      {isCurrent ? " (current step)" : isDone ? " (done)" : isSkipped ? " (skipped)" : ""}
                    </span>
                  </>
                )
                const rowClass = cn(
                  "grid w-full grid-cols-[auto_1fr] items-start gap-3 rounded-md px-2 py-2 text-left text-sm",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                )
                return (
                  <li key={meta.step} aria-current={isCurrent ? "step" : undefined}>
                    {canSelect ? (
                      <button
                        type="button"
                        onClick={() => onStepSelect(meta.step)}
                        className={cn(
                          rowClass,
                          "transition-colors hover:bg-accent/60 hover:text-foreground active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        )}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={rowClass}>{content}</div>
                    )}
                  </li>
                )
              })}
            </ol>
          ) : null}
        </aside>

        <main className="grid content-start py-8 sm:py-12 lg:py-16">
          {step ? <OnboardingProgress step={step} className="mb-10 max-w-xl lg:mb-12" /> : null}
          <div className="w-full max-w-xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
