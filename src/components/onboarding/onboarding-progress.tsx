"use client"

import { motion, useReducedMotion } from "framer-motion"

import type { OnboardingStep } from "@/types"

import { NUMBERED_STEP_TOTAL, STEP_META, stepPositionLabel, stepProgress } from "./steps-meta"

interface OnboardingProgressProps {
  step: OnboardingStep
  className?: string
}

/** "Step N of 6" plus a slim bar. The bar animates with scaleX (transform only). */
export function OnboardingProgress({ step, className }: OnboardingProgressProps) {
  const reduceMotion = useReducedMotion()
  const value = stepProgress(step)
  const meta = STEP_META[step]

  return (
    <div className={className}>
      <p className="font-mono text-xs tabular-nums text-muted-foreground">{stepPositionLabel(step)}</p>
      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={NUMBERED_STEP_TOTAL}
        aria-valuenow={Math.round(value * NUMBERED_STEP_TOTAL)}
        aria-valuetext={meta.number ? stepPositionLabel(step) : meta.badge}
        className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-border"
      >
        <motion.div
          className="h-full w-full origin-left bg-primary"
          initial={false}
          animate={{ scaleX: value }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 26 }}
        />
      </div>
    </div>
  )
}
