"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { Building2, Check, Copy, Link2, Lock, Users, X, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { initials } from "@/components/calls/format"
import { VISIBILITY_LABEL } from "@/components/calls/meeting-utils"
import { ErrorState } from "@/components/shared/error-state"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { useShareMeeting, useShareSettings, useUnshareMeeting } from "@/hooks"
import { cn } from "@/lib/utils"
import { getUserMessage } from "@/lib/utils/errors"
import type { MeetingVisibility, ShareMeetingInput, ShareRecipient, ShareSettings } from "@/types"

type AccessOption = MeetingVisibility | "link"

interface OptionMeta {
  value: AccessOption
  label: string
  description: string
  icon: LucideIcon
}

const OPTIONS: Record<AccessOption, OptionMeta> = {
  private: {
    value: "private",
    label: "Only me",
    description: "Nobody else can open this meeting.",
    icon: Lock,
  },
  attendees: {
    value: "attendees",
    label: "All attendees",
    description: "People who were in the meeting can open it.",
    icon: Users,
  },
  team: {
    value: "team",
    label: "Your team",
    description: "Everyone in your workspace can open it.",
    icon: Building2,
  },
  link: {
    value: "link",
    label: "Anyone with the link",
    description: "Anyone who has the link can open it, even outside your workspace.",
    icon: Link2,
  },
}

const SOURCE_LABEL: Record<ShareRecipient["source"], string> = {
  attendee: "Attendee",
  invited: "Invited",
  team: "Team",
}

const emailSchema = z.string().trim().email()

function currentOption(settings: ShareSettings): AccessOption {
  return settings.linkSharingAvailable && settings.link ? "link" : settings.visibility
}

/** "Only me", "All attendees", and the link option only when the workspace supports it. */
function availableOptions(settings: ShareSettings): OptionMeta[] {
  const list: OptionMeta[] = [OPTIONS.private, OPTIONS.attendees]
  // Team visibility is not a PRD share choice, but a meeting already shared
  // with the team must still show that state rather than hide it.
  if (settings.visibility === "team") list.push(OPTIONS.team)
  if (settings.linkSharingAvailable) list.push(OPTIONS.link)
  return list
}

function toInput(option: AccessOption, settings: ShareSettings): ShareMeetingInput {
  if (option === "link") return { linkEnabled: true }
  return settings.linkSharingAvailable ? { visibility: option, linkEnabled: false } : { visibility: option }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function ShareDialog({
  open,
  onOpenChange,
  meetingId,
  meetingTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId: string
  meetingTitle: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share meeting</DialogTitle>
          <DialogDescription>
            Choose who can open <span className="text-foreground">{meetingTitle}</span>. New meetings are private until
            you share them.
          </DialogDescription>
        </DialogHeader>
        {open ? <ShareDialogBody meetingId={meetingId} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ShareDialogBody({ meetingId }: { meetingId: string }) {
  const settings = useShareSettings(meetingId)

  if (settings.isPending) return <ShareSkeleton />
  if (settings.isError) {
    return (
      <ErrorState
        className="py-6"
        title="Sharing settings didn't load."
        description="The meeting's access hasn't changed. Try again to view or change it."
        onRetry={() => void settings.refetch()}
        retrying={settings.isFetching}
      />
    )
  }
  return <ShareForm settings={settings.data} />
}

function ShareSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-3">
      <span className="sr-only">Loading sharing settings</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function ShareForm({ settings }: { settings: ShareSettings }) {
  const share = useShareMeeting()
  const unshare = useUnshareMeeting()
  const [pending, setPending] = useState<AccessOption | null>(null)
  const value = pending ?? currentOption(settings)
  const options = availableOptions(settings)

  function change(next: string) {
    const option = next as AccessOption
    if (option === currentOption(settings)) return
    setPending(option)
    share.mutate(
      { meetingId: settings.meetingId, input: toInput(option, settings) },
      {
        onSuccess: (result) => {
          const label =
            option === "link" ? OPTIONS.link.label : VISIBILITY_LABEL[result.visibility]
          toast.success("Access updated", { description: label })
        },
        onError: (error) => toast.error("Couldn't change who has access", { description: getUserMessage(error) }),
        onSettled: () => setPending(null),
      },
    )
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2" disabled={!settings.canManage || share.isPending}>
        <legend className="mb-2 text-sm font-medium">Who can access this meeting?</legend>
        <RadioGroup value={value} onValueChange={change} className="gap-0 divide-y divide-border rounded-lg border border-border">
          {options.map((option) => {
            const id = `share-${option.value}`
            const Icon = option.icon
            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cn(
                  "grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-muted/60",
                  "has-[:disabled]:cursor-not-allowed has-[:disabled]:hover:bg-transparent",
                  value === option.value && "bg-primary-soft/50",
                )}
              >
                <Icon className="size-4 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.description}</span>
                </span>
                <RadioGroupItem id={id} value={option.value} />
              </label>
            )
          })}
        </RadioGroup>
        {!settings.canManage ? (
          <p className="text-xs text-muted-foreground">Only the meeting owner can change who has access.</p>
        ) : null}
      </fieldset>

      <CopyLinkRow settings={settings} />

      {settings.canManage ? <InviteForm meetingId={settings.meetingId} /> : null}

      <RecipientList
        settings={settings}
        removingId={unshare.isPending ? unshare.variables?.recipientId : undefined}
        onRemove={(recipient) =>
          unshare.mutate(
            { meetingId: settings.meetingId, recipientId: recipient.id },
            {
              onSuccess: () => toast.success(`${recipient.name} no longer has access`),
              onError: (error) => toast.error("Couldn't remove access", { description: getUserMessage(error) }),
            },
          )
        }
      />
    </div>
  )
}

function CopyLinkRow({ settings }: { settings: ShareSettings }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const publicLink = settings.linkSharingAvailable ? settings.link?.url : undefined
  const url =
    publicLink ?? (typeof window === "undefined" ? "" : `${window.location.origin}/my-calls/${settings.meetingId}`)

  async function copy() {
    const ok = await copyText(url)
    if (!ok) {
      toast.error("Couldn't copy the link", { description: "Select the link and copy it manually." })
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
    toast.success("Link copied", {
      description: publicLink ? "Anyone with this link can open the meeting." : "Only people with access can open it.",
    })
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="share-link">Meeting link</Label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input id="share-link" readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button variant="outline" onClick={() => void copy()} aria-live="polite">
          {copied ? <Check data-icon="inline-start" aria-hidden /> : <Copy data-icon="inline-start" aria-hidden />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  )
}

function InviteForm({ meetingId }: { meetingId: string }) {
  const share = useShareMeeting()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      setError("Enter a valid email address.")
      return
    }
    setError(null)
    share.mutate(
      { meetingId, input: { inviteEmails: [parsed.data] } },
      {
        onSuccess: () => {
          setEmail("")
          toast.success("Access granted", { description: parsed.data })
        },
        onError: (err) => toast.error("Couldn't share the meeting", { description: getUserMessage(err) }),
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-1.5" noValidate>
      <Label htmlFor="share-invite">Add people</Label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          id="share-invite"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "share-invite-error" : undefined}
        />
        <Button type="submit" variant="secondary" disabled={share.isPending || email.trim() === ""}>
          {share.isPending ? "Sharing…" : "Share"}
        </Button>
      </div>
      {error ? (
        <p id="share-invite-error" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}

function RecipientList({
  settings,
  removingId,
  onRemove,
}: {
  settings: ShareSettings
  removingId?: string
  onRemove: (recipient: ShareRecipient) => void
}) {
  return (
    <section aria-labelledby="share-recipients" className="space-y-2">
      <h3 id="share-recipients" className="text-sm font-medium">
        {settings.recipients.length > 0 ? "Meeting shared with" : "Not shared with anyone yet"}
      </h3>
      {settings.recipients.length > 0 ? (
        <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {settings.recipients.map((recipient) => (
            <li key={recipient.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
              <Avatar size="sm">
                {recipient.avatarUrl ? <AvatarImage src={recipient.avatarUrl} alt="" /> : null}
                <AvatarFallback>{initials(recipient.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm">{recipient.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {SOURCE_LABEL[recipient.source]}
                  {recipient.email ? ` · ${recipient.email}` : ""}
                </span>
              </span>
              {recipient.canRemove ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemove(recipient)}
                  disabled={removingId === recipient.id}
                  aria-label={`Remove access for ${recipient.name}`}
                >
                  <X aria-hidden />
                </Button>
              ) : (
                <span aria-hidden className="size-7" />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Only you can see this meeting.</p>
      )}
    </section>
  )
}
