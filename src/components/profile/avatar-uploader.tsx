"use client"

import { Camera } from "lucide-react"
import { useId, useRef, useState } from "react"
import { toast } from "sonner"

import { initials } from "@/components/calls/format"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useUploadAvatar } from "@/hooks"
import { getFieldErrors } from "@/lib/utils/errors"
import type { User } from "@/types"

const MAX_BYTES = 5 * 1024 * 1024

export function AvatarUploader({ user }: { user: User }) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadAvatar()
  const [error, setError] = useState<string | null>(null)
  const name = `${user.firstName} ${user.lastName}`.trim()

  function onFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!file.type.startsWith("image/")) return setError("Choose an image file (PNG, JPG or WebP).")
    if (file.size > MAX_BYTES) return setError("Images must be 5 MB or smaller.")
    upload.mutate(file, {
      onSuccess: () => toast.success("Profile photo updated"),
      onError: (err) => setError(getFieldErrors(err).avatar?.[0] ?? "We couldn't upload that photo. Please try again."),
    })
  }

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-4">
      <Avatar className="size-16 text-lg">
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
        <AvatarFallback>{initials(name || "You")}</AvatarFallback>
      </Avatar>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Profile photo</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-describedby={error ? `${inputId}-error` : `${inputId}-hint`}
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
            <Camera aria-hidden /> {upload.isPending ? "Uploading…" : user.avatarUrl ? "Change photo" : "Upload photo"}
          </Button>
          <span id={`${inputId}-hint`} className="text-xs text-muted-foreground">
            PNG, JPG or WebP, up to 5 MB.
          </span>
        </div>
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
