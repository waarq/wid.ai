"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { OptionCheckboxList, OptionRadioGroup } from "@/components/onboarding/option-list"
import { MEETING_FOCUS_COPY, SHARING_OPTIONS } from "@/components/onboarding/options"
import { MEETING_FOCUS_OPTIONS, SHARING_PREFERENCES, type MeetingSettings } from "@/types"

import { FieldError, SettingsForm } from "./settings-form"
import { useSectionSave } from "./use-section-save"

const schema = z.object({
  defaultSharing: z.enum(SHARING_PREFERENCES),
  meetingFocus: z.array(z.enum(MEETING_FOCUS_OPTIONS)).min(1, "Choose at least one thing for WIT to look for."),
})
type Values = z.infer<typeof schema>

export function MeetingsSection({ meetings }: { meetings: MeetingSettings }) {
  const sharingId = useId()
  const focusId = useId()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { defaultSharing: meetings.defaultSharing, meetingFocus: meetings.meetingFocus },
  })
  const { save, saving, error, saved } = useSectionSave(form, "Meeting settings saved")
  const { errors } = form.formState

  return (
    <SettingsForm
      form={form}
      title="Meetings"
      description="Defaults for every meeting you capture. You can change them per meeting."
      saving={saving}
      error={error}
      saved={saved}
      onSubmit={(values) => save({ section: "meetings", patch: values }, values)}
    >
      <div className="grid gap-2">
        <p id={sharingId} className="text-sm font-medium">
          Default sharing
        </p>
        <p id={`${sharingId}-hint`} className="text-sm text-muted-foreground">
          Who can see notes from a new meeting. Only me keeps it private until you share.
        </p>
        <Controller
          control={form.control}
          name="defaultSharing"
          render={({ field }) => (
            <OptionRadioGroup
              options={SHARING_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              labelledBy={sharingId}
              describedBy={`${sharingId}-hint`}
            />
          )}
        />
      </div>

      <div className="grid gap-2">
        <p id={focusId} className="text-sm font-medium">
          Meeting focus
        </p>
        <p id={`${focusId}-hint`} className="text-sm text-muted-foreground">
          What WIT pays attention to when it understands a meeting.
        </p>
        <Controller
          control={form.control}
          name="meetingFocus"
          render={({ field }) => (
            <OptionCheckboxList
              options={MEETING_FOCUS_COPY}
              value={field.value}
              onValueChange={field.onChange}
              labelledBy={focusId}
              describedBy={errors.meetingFocus ? `${focusId}-error` : `${focusId}-hint`}
              invalid={Boolean(errors.meetingFocus)}
              columns={2}
            />
          )}
        />
        <FieldError id={`${focusId}-error`} message={errors.meetingFocus?.message} />
      </div>
    </SettingsForm>
  )
}
