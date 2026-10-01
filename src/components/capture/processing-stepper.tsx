"use client"

import { Check, X } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import type { ProcessingProgress, ProcessingStep, ProcessingStepStatus } from "@/types"

import { PROCESSING_STEPS } from "./capture-meta"

/** Coarse status used when no step-level progress has arrived yet. */
type CoarseStatus = "processing" | "transcribing" | "understanding" | "ready" | "complete" | "failed"

const ACTIVE_INDEX: Record<CoarseStatus, number> = {
  processing: 0,
  transcribing: 1,
  understanding: 2,
  ready: PROCESSING_STEPS.length,
  complete: PROCESSING_STEPS.length,
  failed: -1,
}

function deriveSteps(progress: ProcessingProgress | undefined, status: CoarseStatus): ProcessingStep[] {
  if (progress && progress.steps.length > 0) {
    return PROCESSING_STEPS.map(({ id }) => progress.steps.find((s) => s.id === id) ?? { id, status: "pending" })
  }
  const active = ACTIVE_INDEX[status]
  return PROCESSING_STEPS.map(({ id }, i) => ({
    id,
    status: i < active ? "complete" : i === active ? "active" : status === "failed" && i === 0 ? "failed" : "pending",
  }))
}

function StepIcon({ status }: { status: ProcessingStepStatus }) {
  const reduce = useReducedMotion()
  if (status === "complete") {
    return (
      <motion.span
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
      >
        <Check className="size-3" aria-hidden />
      </motion.span>
    )
  }
  if (status === "failed") {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-destructive-soft text-destructive">
        <X className="size-3" aria-hidden />
      </span>
    )
  }
  if (status === "active") {
    return (
      <span className="grid size-5 place-items-center rounded-full border border-primary">
        <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />
      </span>
    )
  }
  return <span className="size-5 rounded-full border border-border-strong" />
}

const STATUS_TEXT: Record<ProcessingStepStatus, string> = {
  complete: "done",
  active: "in progress",
  pending: "not started",
  failed: "failed",
}

/**
 * "Processing your meeting" checklist from the PRD. Driven by server step
 * progress when available, otherwise by the coarse meeting/capture status.
 * The current step is announced politely to screen readers.
 */
export function ProcessingStepper({
  progress,
  status,
  className,
}: {
  progress?: ProcessingProgress
  status: CoarseStatus
  className?: string
}) {
  const steps = deriveSteps(progress, status)
  const current =
    steps.find((s) => s.status === "failed") ?? steps.find((s) => s.status === "active") ?? undefined
  const currentLabel = current ? PROCESSING_STEPS.find((s) => s.id === current.id)?.label : undefined
  const announcement =
    current?.status === "failed"
      ? `Processing stopped at: ${currentLabel}`
      : currentLabel
        ? `${currentLabel}…`
        : steps.every((s) => s.status === "complete")
          ? "Meeting ready"
          : "Processing your meeting"

  return (
    <div className={className}>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <ol className="space-y-2.5">
        {steps.map((step) => {
          const label = PROCESSING_STEPS.find((s) => s.id === step.id)?.label ?? step.id
          return (
            <li key={step.id} className="grid grid-cols-[auto_1fr] items-center gap-3 text-sm">
              <StepIcon status={step.status} />
              <span
                className={cn(
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "active" && "font-medium text-foreground",
                  step.status === "failed" && "text-destructive",
                )}
              >
                {label}
                <span className="sr-only">, {STATUS_TEXT[step.status]}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export type { CoarseStatus as ProcessingStepperStatus }
