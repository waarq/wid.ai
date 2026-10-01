"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, ShieldCheck } from "lucide-react"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { OptionRadioGroup } from "@/components/onboarding/option-list"
import { CAPTURE_PREFERENCE_OPTIONS, type OptionCopy } from "@/components/onboarding/options"
import { Badge } from "@/components/ui/badge"
import { CAPTURE_MODES, CAPTURE_PREFERENCES, type CaptureMode, type CaptureSettings } from "@/types"

import { SettingsForm, SwitchField } from "./settings-form"
import { useSectionSave } from "./use-section-save"

const CAPTURE_MODE_OPTIONS: OptionCopy<CaptureMode>[] = [
  { value: "audio", label: "Audio", description: "Capture the meeting's audio and produce a transcript." },
  { value: "video", label: "Video", description: "Capture audio and video." },
  { value: "transcript_only", label: "Transcript only", description: "Keep the transcript and notes, but no recording." },
]

const schema = z.object({
  capturePreference: z.enum(CAPTURE_PREFERENCES),
  defaultCaptureMode: z.enum(CAPTURE_MODES),
  confirmBeforeCapture: z.boolean(),
})
type Values = z.infer<typeof schema>

export function CaptureSection({ capture }: { capture: CaptureSettings }) {
  const modeId = useId()
  const prefId = useId()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      capturePreference: capture.capturePreference,
      defaultCaptureMode: capture.defaultCaptureMode,
      confirmBeforeCapture: capture.confirmBeforeCapture,
    },
  })
  const { save, saving, error, saved } = useSectionSave(form, "Capture settings saved")

  return (
    <SettingsForm
      form={form}
      title="Capture"
      description="How WID captures meetings. Capture always starts with you."
      saving={saving}
      error={error}
      saved={saved}
      onSubmit={(values) => save({ section: "capture", patch: values }, values)}
    >
      {/* Product rule, never a toggle: manualCapture is the literal `true`. */}
      <section aria-labelledby="manual-capture" className="grid grid-cols-[auto_1fr_auto] items-start gap-3 border-y border-border py-4">
        <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary-ink" aria-hidden>
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h3 id="manual-capture" className="text-sm font-medium">
            Manual capture
          </h3>
          <p className="text-sm text-muted-foreground">
            WID will not automatically record calendar meetings. A meeting is captured only when you start it.
          </p>
        </div>
        <Badge variant="success" className="gap-1">
          <Lock className="size-3" aria-hidden /> Enabled
          <span className="sr-only">. Locked: this cannot be turned off.</span>
        </Badge>
      </section>

      <div className="grid gap-2">
        <p id={modeId} className="text-sm font-medium">
          Default capture mode
        </p>
        <p id={`${modeId}-hint`} className="text-sm text-muted-foreground">
          What a new capture starts with. You can change it before you start.
        </p>
        <Controller
          control={form.control}
          name="defaultCaptureMode"
          render={({ field }) => (
            <OptionRadioGroup
              options={CAPTURE_MODE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              labelledBy={modeId}
              describedBy={`${modeId}-hint`}
            />
          )}
        />
      </div>

      <div className="grid gap-2">
        <p id={prefId} className="text-sm font-medium">
          Meetings available for capture
        </p>
        <p id={`${prefId}-hint`} className="text-sm text-muted-foreground">
          Which meetings WID offers a Capture button for. None of these start recording on their own.
        </p>
        <Controller
          control={form.control}
          name="capturePreference"
          render={({ field }) => (
            <OptionRadioGroup
              options={CAPTURE_PREFERENCE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              labelledBy={prefId}
              describedBy={`${prefId}-hint`}
            />
          )}
        />
      </div>

      <div className="divide-y divide-border border-y border-border">
        <SwitchField
          control={form.control}
          name="confirmBeforeCapture"
          label="Confirm before capturing"
          description="Show a confirmation with the meeting and mode before capture begins."
        />
      </div>
    </SettingsForm>
  )
}
