"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile } from "@/hooks"
import { personalizeStepSchema, type PersonalizeFormValues } from "@/lib/validation/onboarding"
import type { User } from "@/types"

import { OptionCheckboxList } from "../option-list"
import { GOAL_OPTIONS } from "../options"
import { OnboardingQuestion } from "../onboarding-question"
import { TimezoneCombobox } from "../timezone-combobox"
import type { StepProps } from "./types"

const DEFAULT_TIMEZONE = "Asia/Karachi"

/* Step 6: personalize. React Hook Form + Zod; names prefilled from the profile. */
export function PersonalizeStep(props: StepProps) {
  const profile = useProfile()

  if (profile.isPending) {
    return (
      <div className="grid gap-8" aria-busy="true" aria-label="Loading your profile">
        <div className="grid gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
        <Skeleton className="h-9" />
      </div>
    )
  }

  // A failed profile load is not fatal: the user can type their name.
  return <PersonalizeForm {...props} profile={profile.data ?? null} />
}

function PersonalizeForm({ profile, ...props }: StepProps & { profile: User | null }) {
  const firstId = useId()
  const lastId = useId()
  const tzId = useId()
  const goalsId = useId()
  const busy = props.pending !== null

  const form = useForm<PersonalizeFormValues>({
    resolver: zodResolver(personalizeStepSchema),
    defaultValues: {
      firstName: props.draft.firstName ?? profile?.firstName ?? "",
      lastName: props.draft.lastName ?? profile?.lastName ?? "",
      timezone: props.draft.timezone ?? profile?.timezone ?? DEFAULT_TIMEZONE,
      goals: props.draft.goals ?? [],
    },
    mode: "onTouched",
  })
  const { errors } = form.formState

  const submit = form.handleSubmit((values) => {
    const parsed = personalizeStepSchema.parse(values)
    props.onSave({ step: "personalize", data: parsed })
  })

  return (
    <OnboardingQuestion
      pending={props.pending}
      error={props.error}
      onRetry={props.onRetry}
      onBack={props.onBack}
      focusHeading={props.focusHeading}
      title="Personalize your WID"
      description="A few details so WID greets you properly and shows meeting times in your timezone."
      onSubmit={() => void submit()}
    >
      <div className="grid gap-8">
        <fieldset className="grid gap-3" disabled={busy}>
          <legend className="mb-3 text-sm font-medium text-foreground">What should we call you?</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={firstId}>First name</Label>
              <Input
                id={firstId}
                autoComplete="given-name"
                className="h-9"
                aria-invalid={Boolean(errors.firstName) || undefined}
                aria-describedby={errors.firstName ? `${firstId}-error` : undefined}
                {...form.register("firstName")}
              />
              {errors.firstName ? (
                <p id={`${firstId}-error`} className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={lastId}>Last name</Label>
              <Input
                id={lastId}
                autoComplete="family-name"
                className="h-9"
                aria-invalid={Boolean(errors.lastName) || undefined}
                aria-describedby={errors.lastName ? `${lastId}-error` : undefined}
                {...form.register("lastName")}
              />
              {errors.lastName ? (
                <p id={`${lastId}-error`} className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <div className="grid gap-1.5">
          <Label htmlFor={tzId}>What timezone are you in?</Label>
          <Controller
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <TimezoneCombobox
                id={tzId}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={busy}
                invalid={Boolean(errors.timezone)}
                describedBy={errors.timezone ? `${tzId}-error` : `${tzId}-hint`}
              />
            )}
          />
          {errors.timezone ? (
            <p id={`${tzId}-error`} className="text-sm text-destructive">
              {errors.timezone.message}
            </p>
          ) : (
            <p id={`${tzId}-hint`} className="text-sm text-muted-foreground">
              Meeting times, reminders and due dates use this timezone.
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <p id={goalsId} className="text-sm font-medium text-foreground">
            What do you want WID to help you with?{" "}
            <span className="font-normal text-muted-foreground">Optional</span>
          </p>
          <Controller
            control={form.control}
            name="goals"
            render={({ field }) => (
              <OptionCheckboxList
                options={GOAL_OPTIONS}
                value={field.value}
                onValueChange={field.onChange}
                labelledBy={goalsId}
                columns={2}
                disabled={busy}
              />
            )}
          />
        </div>
      </div>
    </OnboardingQuestion>
  )
}
