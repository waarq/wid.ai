"use client"

import { useId } from "react"
import { Controller, type UseFormReturn } from "react-hook-form"

import { JOB_FUNCTION_OPTIONS, EMAIL_TYPE_OPTIONS } from "@/components/onboarding/options"
import { OptionRadioGroup } from "@/components/onboarding/option-list"
import { TimezoneCombobox } from "@/components/onboarding/timezone-combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { ProfileValues } from "./profile-schema"

function Err({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

/** The editable identity fields, with the read-only email, used by Profile and Settings > General. */
export function ProfileFields({ form, email }: { form: UseFormReturn<ProfileValues>; email: string }) {
  const firstId = useId()
  const lastId = useId()
  const emailId = useId()
  const jobId = useId()
  const tzId = useId()
  const typeId = useId()
  const { errors } = form.formState

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={firstId}>First name</Label>
          <Input
            id={firstId}
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName) || undefined}
            aria-describedby={errors.firstName ? `${firstId}-error` : undefined}
            {...form.register("firstName")}
          />
          <Err id={`${firstId}-error`} message={errors.firstName?.message} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={lastId}>Last name</Label>
          <Input
            id={lastId}
            autoComplete="family-name"
            aria-invalid={Boolean(errors.lastName) || undefined}
            aria-describedby={errors.lastName ? `${lastId}-error` : undefined}
            {...form.register("lastName")}
          />
          <Err id={`${lastId}-error`} message={errors.lastName?.message} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={emailId}>Email</Label>
        <Input id={emailId} type="email" value={email} readOnly aria-describedby={`${emailId}-hint`} className="bg-muted/50" />
        <p id={`${emailId}-hint`} className="text-sm text-muted-foreground">
          This comes from your Google account, so it can&apos;t be changed here.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={jobId}>Job function</Label>
        <Controller
          control={form.control}
          name="jobFunction"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger
                id={jobId}
                className="w-full sm:w-72"
                aria-invalid={Boolean(errors.jobFunction) || undefined}
                aria-describedby={errors.jobFunction ? `${jobId}-error` : undefined}
                onBlur={field.onBlur}
              >
                <SelectValue placeholder="Choose your job function" />
              </SelectTrigger>
              <SelectContent>
                {JOB_FUNCTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <Err id={`${jobId}-error`} message={errors.jobFunction?.message} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={tzId}>Timezone</Label>
        <Controller
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <TimezoneCombobox
              id={tzId}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={Boolean(errors.timezone)}
              describedBy={errors.timezone ? `${tzId}-error` : `${tzId}-hint`}
            />
          )}
        />
        {errors.timezone ? (
          <Err id={`${tzId}-error`} message={errors.timezone.message} />
        ) : (
          <p id={`${tzId}-hint`} className="text-sm text-muted-foreground">
            Meeting times, reminders and due dates use this timezone.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <p id={typeId} className="text-sm font-medium leading-none">
          Account type
        </p>
        <p id={`${typeId}-hint`} className="text-sm text-muted-foreground">
          The email type you chose for yourself. WIT never guesses it from your address.
        </p>
        <Controller
          control={form.control}
          name="emailType"
          render={({ field }) => (
            <OptionRadioGroup
              options={EMAIL_TYPE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              labelledBy={typeId}
              describedBy={errors.emailType ? `${typeId}-error` : `${typeId}-hint`}
              invalid={Boolean(errors.emailType)}
            />
          )}
        />
        <Err id={`${typeId}-error`} message={errors.emailType?.message} />
      </div>
    </>
  )
}
