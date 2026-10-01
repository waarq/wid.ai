"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { OptionRadioGroup } from "@/components/onboarding/option-list"
import type { OptionCopy } from "@/components/onboarding/options"
import { MEETING_FOCUS_OPTIONS, type AiSettings, type SummaryLength } from "@/types"

import { PriorityList } from "./priority-list"
import { FieldError, SettingsForm, SwitchField } from "./settings-form"
import { useSectionSave } from "./use-section-save"

const LENGTH_OPTIONS: OptionCopy<SummaryLength>[] = [
  { value: "brief", label: "Brief", description: "A few lines. Decisions and actions only." },
  { value: "standard", label: "Standard", description: "A short summary with the key moments." },
  { value: "detailed", label: "Detailed", description: "A fuller summary with context and open questions." },
]

const schema = z.object({
  priorities: z.array(z.enum(MEETING_FOCUS_OPTIONS)).min(1, "Choose at least one priority."),
  summaryLength: z.enum(["brief", "standard", "detailed"]),
  personalizeByJobFunction: z.boolean(),
  showSuggestedQuestions: z.boolean(),
})
type Values = z.infer<typeof schema>

export function AiSection({ ai }: { ai: AiSettings }) {
  const prioritiesId = useId()
  const lengthId = useId()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      priorities: ai.priorities,
      summaryLength: ai.summaryLength,
      personalizeByJobFunction: ai.personalizeByJobFunction,
      showSuggestedQuestions: ai.showSuggestedQuestions,
    },
  })
  const { save, saving, error, saved } = useSectionSave(form, "AI settings saved")
  const { errors } = form.formState

  return (
    <SettingsForm
      form={form}
      title="AI & Understanding"
      description="How WID reads your meetings. Every insight still links back to the exact moment it came from."
      saving={saving}
      error={error}
      saved={saved}
      onSubmit={(values) => save({ section: "ai", patch: values }, values)}
    >
      <div className="grid gap-2">
        <p id={prioritiesId} className="text-sm font-medium">
          What should WID prioritize?
        </p>
        <p id={`${prioritiesId}-hint`} className="text-sm text-muted-foreground">
          Ordered by importance. The first item is weighted highest in summaries.
        </p>
        <Controller
          control={form.control}
          name="priorities"
          render={({ field }) => (
            <PriorityList
              value={field.value}
              onChange={field.onChange}
              labelledBy={prioritiesId}
              describedBy={errors.priorities ? `${prioritiesId}-error` : `${prioritiesId}-hint`}
            />
          )}
        />
        <FieldError id={`${prioritiesId}-error`} message={errors.priorities?.message} />
      </div>

      <div className="grid gap-2">
        <p id={lengthId} className="text-sm font-medium">
          Summary length
        </p>
        <Controller
          control={form.control}
          name="summaryLength"
          render={({ field }) => (
            <OptionRadioGroup options={LENGTH_OPTIONS} value={field.value} onValueChange={field.onChange} labelledBy={lengthId} />
          )}
        />
      </div>

      <div className="divide-y divide-border border-y border-border">
        <SwitchField
          control={form.control}
          name="personalizeByJobFunction"
          label="Tailor to my job function"
          description="Summaries and suggested questions lean toward what your role cares about."
        />
        <SwitchField
          control={form.control}
          name="showSuggestedQuestions"
          label="Show suggested questions"
          description="Offer starter questions in Ask this meeting."
        />
      </div>
    </SettingsForm>
  )
}
