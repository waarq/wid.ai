"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { ProfileFields } from "@/components/profile/profile-fields"
import { profileSchema, type ProfileValues } from "@/components/profile/profile-schema"
import type { GeneralSettings } from "@/types"

import { SettingsForm } from "./settings-form"
import { useSectionSave } from "./use-section-save"

export function GeneralSection({ general }: { general: GeneralSettings }) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: general.firstName,
      lastName: general.lastName,
      timezone: general.timezone,
      jobFunction: general.jobFunction ?? undefined,
      emailType: general.emailType ?? undefined,
    },
    mode: "onTouched",
  })
  const { save, saving, error, saved } = useSectionSave(form, "General settings saved")

  return (
    <SettingsForm
      form={form}
      title="General"
      description="Your name and defaults. These match your Profile."
      saving={saving}
      error={error}
      saved={saved}
      onSubmit={(values) => save({ section: "general", patch: values }, values)}
    >
      <ProfileFields form={form} email={general.email} />
    </SettingsForm>
  )
}
