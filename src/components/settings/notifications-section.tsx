"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { NotificationSettings } from "@/types"

import { SettingsForm, SwitchField } from "./settings-form"
import { useSectionSave } from "./use-section-save"

const schema = z.object({
  processingCompleted: z.boolean(),
  actionItemReminders: z.boolean(),
  mentions: z.boolean(),
  sharedMeetings: z.boolean(),
  dealUpdates: z.boolean(),
  weeklySummary: z.boolean(),
  channels: z
    .object({ inApp: z.boolean(), email: z.boolean() })
    .refine((c) => c.inApp || c.email, "Keep at least one way to be notified, or turn the notifications off above."),
})
type Values = z.infer<typeof schema>

export function NotificationsSection({ notifications }: { notifications: NotificationSettings }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: notifications })
  const { save, saving, error, saved } = useSectionSave(form, "Notification settings saved")
  const channelError = form.formState.errors.channels?.root?.message ?? form.formState.errors.channels?.message

  return (
    <SettingsForm
      form={form}
      title="Notifications"
      description="Choose what is worth interrupting you for."
      saving={saving}
      error={error}
      saved={saved}
      onSubmit={(values) => save({ section: "notifications", patch: values }, values)}
    >
      <div className="divide-y divide-border border-y border-border">
        <SwitchField control={form.control} name="processingCompleted" label="Meeting processing completed" description="When a captured meeting is ready to read." />
        <SwitchField control={form.control} name="actionItemReminders" label="Action item reminders" description="Before your action items are due." />
        <SwitchField control={form.control} name="mentions" label="Mentions" description="When someone mentions you in a meeting or note." />
        <SwitchField control={form.control} name="sharedMeetings" label="Shared meeting notifications" description="When a teammate shares a meeting with you." />
        <SwitchField control={form.control} name="dealUpdates" label="Deal updates" description="Stage changes and new signals on your deals." />
        <SwitchField control={form.control} name="weeklySummary" label="Weekly meeting summary" description="A Monday recap of last week's decisions and open actions." />
      </div>

      <div className="grid gap-1">
        <h3 className="text-sm font-medium">Delivery</h3>
        <div className="divide-y divide-border border-y border-border">
          <SwitchField control={form.control} name="channels.inApp" label="In WIT" description="Show notifications in the bell menu and Alerts." />
          <SwitchField control={form.control} name="channels.email" label="Email" description="Also send them to your Google account email." />
        </div>
        {channelError ? (
          <p role="alert" className="text-sm text-destructive">
            {channelError}
          </p>
        ) : null}
      </div>
    </SettingsForm>
  )
}
