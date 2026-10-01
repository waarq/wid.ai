"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CircleCheck } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ErrorState } from "@/components/shared/error-state"
import { UnsavedChangesGuard } from "@/components/settings/unsaved-changes-guard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile, useUpdateProfile } from "@/hooks"
import { getUserMessage } from "@/lib/utils/errors"
import type { User } from "@/types"

import { AvatarUploader } from "./avatar-uploader"
import { ProfileFields } from "./profile-fields"
import { profileSchema, type ProfileValues } from "./profile-schema"

export function ProfileView() {
  const profile = useProfile()

  if (profile.isPending) return <ProfileSkeleton />
  if (profile.isError) {
    return (
      <ErrorState
        title="We couldn't load your profile."
        description="Your details haven't changed. Try again in a moment."
        onRetry={() => void profile.refetch()}
        retrying={profile.isRefetching}
      />
    )
  }
  return <ProfileForm user={profile.data} />
}

function toValues(user: User): Partial<ProfileValues> {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    timezone: user.timezone,
    jobFunction: user.jobFunction ?? undefined,
    emailType: user.emailType ?? undefined,
  }
}

function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [saved, setSaved] = useState(false)
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toValues(user),
    mode: "onTouched",
  })
  const dirty = form.formState.isDirty

  const submit = form.handleSubmit((values) => {
    update.mutate(values, {
      onSuccess: () => {
        form.reset(values)
        setSaved(true)
        toast.success("Profile updated")
      },
      onError: () => toast.error("We couldn't update your profile. Please try again."),
    })
  })

  return (
    <form
      onSubmit={(e) => void submit(e)}
      noValidate
      onChange={() => setSaved(false)}
      className="grid max-w-2xl gap-6"
    >
      <UnsavedChangesGuard dirty={dirty} />
      <AvatarUploader user={user} />
      <div className="border-t border-border" />
      <fieldset disabled={update.isPending} className="grid min-w-0 gap-6">
        <ProfileFields form={form} email={user.email} />
      </fieldset>

      {update.isError ? (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-foreground">
          {getUserMessage(update.error)} Your changes were not saved.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={!dirty || update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" disabled={!dirty || update.isPending} onClick={() => form.reset()}>
          Discard
        </Button>
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {dirty ? (
            "Unsaved changes"
          ) : saved ? (
            <span className="inline-flex items-center gap-1.5">
              <CircleCheck aria-hidden className="size-4 text-primary" /> Saved
            </span>
          ) : null}
        </p>
      </div>
    </form>
  )
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid max-w-2xl gap-6">
      <span className="sr-only">Loading your profile</span>
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-32" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <Skeleton className="h-9" />
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-9" />
      <Skeleton className="h-28" />
    </div>
  )
}
