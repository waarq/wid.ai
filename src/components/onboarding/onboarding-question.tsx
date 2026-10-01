"use client"

import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react"
import { useEffect, useId, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface OnboardingQuestionProps {
  title: string
  description?: ReactNode
  /** Small line above the title (e.g. "Welcome, Waleed."). */
  eyebrow?: ReactNode
  children: ReactNode
  onSubmit: () => void
  onBack?: () => void
  onSkip?: () => void
  skipLabel?: string
  continueLabel?: string
  /** Hide the primary button (e.g. calendar not yet connected). */
  hideContinue?: boolean
  /** Which action is saving; disables every control while set. */
  pending?: "continue" | "skip" | null
  /** User-safe save error for this step. */
  error?: string | null
  onRetry?: () => void
  /** Text under the footer (e.g. why connecting is worth it). */
  footerNote?: ReactNode
  /** Focus the heading on mount (step changes, not the first page load). */
  focusHeading?: boolean
  /** Exposed so inputs can reference the question with aria-labelledby. */
  titleId?: string
  descriptionId?: string
}

/*
 * One onboarding question as a form: Question, Description, Input, then
 * Back / Skip / Continue. Enter continues, including from radio and checkbox
 * rows (Radix swallows Enter on those per WAI-ARIA, so it is re-routed here).
 */
export function OnboardingQuestion({
  title,
  description,
  eyebrow,
  children,
  onSubmit,
  onBack,
  onSkip,
  skipLabel = "Skip for now",
  continueLabel = "Continue",
  hideContinue = false,
  pending = null,
  error,
  onRetry,
  footerNote,
  focusHeading = false,
  titleId: titleIdProp,
  descriptionId: descriptionIdProp,
}: OnboardingQuestionProps) {
  const generatedTitleId = useId()
  const generatedDescriptionId = useId()
  const titleId = titleIdProp ?? generatedTitleId
  const descriptionId = descriptionIdProp ?? generatedDescriptionId
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const busy = pending !== null

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus({ preventScroll: true })
  }, [focusHeading])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    const role = (event.target as HTMLElement).getAttribute("role")
    if (role === "radio" || role === "checkbox") {
      event.preventDefault()
      if (!hideContinue) formRef.current?.requestSubmit()
    }
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={busy || undefined}
      className="grid gap-8"
    >
      <div className="grid gap-3">
        {eyebrow ? <p className="text-sm text-muted-foreground">{eyebrow}</p> : null}
        <h1
          ref={headingRef}
          id={titleId}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight text-balance text-foreground outline-none sm:text-[1.75rem] sm:leading-tight"
        >
          {title}
        </h1>
        {description ? (
          <div id={descriptionId} className="max-w-[56ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>

      <div>{children}</div>

      {error ? (
        <div
          role="alert"
          className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-lg bg-destructive-soft px-3 py-3 text-sm"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 text-destructive" />
          <div className="grid gap-2">
            <p className="text-foreground">{error}</p>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => (onRetry ? onRetry() : formRef.current?.requestSubmit())}
              >
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 border-t border-border pt-6">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          {onBack ? (
            <Button type="button" variant="ghost" size="lg" onClick={onBack} disabled={busy} className="-ml-2.5">
              <ArrowLeft aria-hidden />
              Back
            </Button>
          ) : (
            <span />
          )}
          <div className="justify-self-end">
            {onSkip ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={onSkip}
                disabled={busy}
                className="text-muted-foreground"
              >
                {pending === "skip" ? <Loader2 aria-hidden className="animate-spin" /> : null}
                {skipLabel}
              </Button>
            ) : null}
          </div>
          {hideContinue ? (
            <span />
          ) : (
            <Button type="submit" size="lg" disabled={busy} className={cn("min-w-28 px-4")}>
              {pending === "continue" ? (
                <>
                  <Loader2 aria-hidden className="animate-spin" />
                  Saving
                </>
              ) : (
                continueLabel
              )}
            </Button>
          )}
        </div>
        {footerNote ? <div className="text-sm text-muted-foreground">{footerNote}</div> : null}
      </div>
    </form>
  )
}
