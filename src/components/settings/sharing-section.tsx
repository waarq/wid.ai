"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Link2, Link2Off } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { SharingSettings } from "@/types"

import { SettingsForm, SwitchField } from "./settings-form"
import { useSectionSave } from "./use-section-save"

const schema = z.object({
  includeTranscriptWhenSharing: z.boolean(),
  includeRecordingWhenSharing: z.boolean(),
  allowRecipientsToReshare: z.boolean(),
})
type Values = z.infer<typeof schema>

export function SharingSection({ sharing }: { sharing: SharingSettings }) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      includeTranscriptWhenSharing: sharing.includeTranscriptWhenSharing,
      includeRecordingWhenSharing: sharing.includeRecordingWhenSharing,
      allowRecipientsToReshare: sharing.allowRecipientsToReshare,
    },
  })
  const { save, saving, error, saved } = useSectionSave(form, "Sharing settings saved")

  return (
    <SettingsForm
      form={form}
      title="Sharing"
      description="What recipients receive when you share a meeting."
      saving={saving}
      error={error}
      saved={saved}
      onSubmit={(values) => save({ section: "sharing", patch: values }, values)}
    >
      <div className="grid grid-cols-[auto_1fr] items-start gap-3 border-y border-border py-4">
        <span className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground" aria-hidden>
          {sharing.linkSharingAvailable ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
        </span>
        <div className="space-y-0.5">
          <h3 className="text-sm font-medium">Link sharing</h3>
          <p className="text-sm text-muted-foreground">
            {sharing.linkSharingAvailable
              ? "Your workspace allows sharing a meeting with anyone who has the link. You choose this per meeting."
              : "Your workspace doesn't allow link sharing, so meetings can only be shared with specific people."}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border border-y border-border">
        <SwitchField
          control={form.control}
          name="includeTranscriptWhenSharing"
          label="Include the transcript"
          description="Recipients can read the full transcript, not only the summary."
        />
        <SwitchField
          control={form.control}
          name="includeRecordingWhenSharing"
          label="Include the recording"
          description="Recipients can play the audio or video. Off keeps it to you."
        />
        <SwitchField
          control={form.control}
          name="allowRecipientsToReshare"
          label="Let recipients share it onward"
          description="Off means only you can add more people."
        />
      </div>
    </SettingsForm>
  )
}
