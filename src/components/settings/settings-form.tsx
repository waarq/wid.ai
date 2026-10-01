"use client"

import { CircleCheck } from "lucide-react"
import { useId, type ReactNode } from "react"
import { Controller, type Control, type FieldValues, type Path, type UseFormReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getUserMessage } from "@/lib/utils/errors"

import { UnsavedChangesGuard } from "./unsaved-changes-guard"

export function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

interface SettingsFormProps<T extends FieldValues> {
  form: UseFormReturn<T>
  title: string
  description: string
  onSubmit: (values: T) => void
  saving: boolean
  error: unknown
  /** Set after a successful save; cleared by the next edit. */
  saved: boolean
  children: ReactNode
}

/** Shared frame for every editable section: heading, fields, status, Save / Discard. */
export function SettingsForm<T extends FieldValues>({
  form,
  title,
  description,
  onSubmit,
  saving,
  error,
  saved,
  children,
}: SettingsFormProps<T>) {
  const dirty = form.formState.isDirty
  return (
    <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate className="grid gap-6">
      <UnsavedChangesGuard dirty={dirty} />
      <SectionHeading title={title} description={description} />
      <fieldset disabled={saving} className="grid min-w-0 gap-6">
        {children}
      </fieldset>

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-foreground">
          {getUserMessage(error)} Your changes were not saved. Your previous settings are still in place.
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 grid grid-cols-[1fr_auto] items-center gap-3 border-t border-border bg-background px-4 py-3 sm:mx-0 sm:px-0">
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {dirty ? (
            <span className="inline-flex items-center gap-2 text-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-warning" /> Unsaved changes
            </span>
          ) : saved ? (
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck aria-hidden className="size-4 text-primary" /> Saved
            </span>
          ) : (
            "All changes saved"
          )}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={!dirty || saving} onClick={() => form.reset()}>
            Discard
          </Button>
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  )
}

/** Label + description on the left, switch on the right. */
export function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 py-3.5">
      <div className="min-w-0 space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p id={`${id}-desc`} className="text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
      />
    </div>
  )
}

/** SwitchRow bound to a boolean form field. */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: {
  control: Control<T>
  name: Path<T>
  label: string
  description?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SwitchRow label={label} description={description} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
      )}
    />
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  )
}
