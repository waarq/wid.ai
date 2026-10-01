"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  Briefcase,
  CalendarDays,
  CircleCheck,
  Database,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  Video,
  type LucideIcon,
} from "lucide-react"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useConfigureIntegration, useConnectIntegration, useDisconnectIntegration } from "@/hooks"
import { getUserMessage } from "@/lib/utils/errors"
import { cn } from "@/lib/utils"
import { CAPTURE_MODES, type CaptureMode, type Integration, type IntegrationProvider } from "@/types"

interface ProviderCopy {
  label: string
  description: string
  icon: LucideIcon
  /** Shown if connecting fails. */
  failure: string
}

export const INTEGRATION_COPY: Record<IntegrationProvider, ProviderCopy> = {
  google: {
    label: "Google",
    description: "Your sign-in. WID uses it to know who you are.",
    icon: ShieldCheck,
    failure: "Google couldn't be reached.",
  },
  google_calendar: {
    label: "Google Calendar",
    description: "Shows your upcoming meetings so you can capture them. Nothing is recorded automatically.",
    icon: CalendarDays,
    failure: "Google Calendar connection failed.",
  },
  zoom: {
    label: "Zoom",
    description: "Lets WID work with your Zoom meetings when you choose to capture them.",
    icon: Video,
    failure: "Zoom connection failed.",
  },
  slack: { label: "Slack", description: "Post meeting summaries to a channel.", icon: MessageSquare, failure: "Slack isn't available yet." },
  microsoft_calendar: {
    label: "Microsoft Calendar",
    description: "Bring Outlook meetings into WID.",
    icon: CalendarDays,
    failure: "Microsoft Calendar isn't available yet.",
  },
  hubspot: { label: "HubSpot", description: "Sync deals from your conversations.", icon: Briefcase, failure: "HubSpot isn't available yet." },
  salesforce: { label: "Salesforce", description: "Sync deals from your conversations.", icon: Database, failure: "Salesforce isn't available yet." },
}

const CAPTURE_MODE_LABEL: Record<CaptureMode, string> = {
  audio: "Audio",
  video: "Video",
  transcript_only: "Transcript only",
}

function isConfigurable(integration: Integration): boolean {
  return integration.status === "connected" && (integration.provider === "google_calendar" || integration.provider === "zoom")
}

/**
 * One integration, any status: Connect / Connected + Configure + Disconnect /
 * Coming later. Makes no assumption about OAuth: if `connect()` returns an
 * `authorizationUrl`, the browser navigates there.
 */
export function IntegrationCard({ integration }: { integration: Integration }) {
  const copy = INTEGRATION_COPY[integration.provider]
  const Icon = copy.icon
  const connect = useConnectIntegration()
  const disconnect = useDisconnectIntegration()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [configureOpen, setConfigureOpen] = useState(false)
  const connected = integration.status === "connected"
  const comingSoon = integration.status === "coming_soon"
  const canDisconnect = connected && integration.provider !== "google"

  function handleConnect() {
    connect.mutate(integration.provider, {
      onSuccess: (result) => {
        if (result.authorizationUrl) {
          window.location.assign(result.authorizationUrl)
          return
        }
        toast.success(`${copy.label} connected`)
      },
    })
  }

  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-3 py-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground",
          connected && "border-primary/30 bg-primary-soft text-primary-ink",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
          {copy.label}
          {connected ? (
            <Badge variant="success" className="gap-1">
              <CircleCheck className="size-3" aria-hidden /> Connected
            </Badge>
          ) : comingSoon ? (
            <Badge variant="muted">Coming later</Badge>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
        {connected && integration.accountLabel ? (
          <p className="truncate text-xs text-muted-foreground">{integration.accountLabel}</p>
        ) : null}
        {connect.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {copy.failure} Your meetings haven&apos;t been changed.
          </p>
        ) : null}
        {disconnect.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {getUserMessage(disconnect.error)}
          </p>
        ) : null}
      </div>

      <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:justify-end">
        {comingSoon ? null : !connected ? (
          <Button type="button" size="sm" disabled={connect.isPending} onClick={handleConnect}>
            {connect.isPending ? "Connecting…" : connect.isError ? "Try again" : "Connect"}
          </Button>
        ) : (
          <>
            {isConfigurable(integration) ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setConfigureOpen(true)}>
                <SlidersHorizontal aria-hidden /> Configure
              </Button>
            ) : null}
            {canDisconnect ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
                Disconnect
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Used to sign in</span>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Disconnect ${copy.label}?`}
        description="WID will stop using this connection. Your existing meeting notes and transcripts are not deleted, and you can reconnect any time."
        confirmLabel="Disconnect"
        variant="destructive"
        loading={disconnect.isPending}
        onConfirm={() =>
          disconnect.mutate(integration.provider, {
            onSuccess: () => {
              setConfirmOpen(false)
              toast.success(`${copy.label} disconnected`, { description: "Your existing meeting notes are unchanged." })
            },
            onError: () => {
              setConfirmOpen(false)
              toast.error(`${copy.label} couldn't be disconnected. Please try again.`)
            },
          })
        }
      />

      {configureOpen && integration.provider === "google_calendar" && integration.settings ? (
        <ConfigureCalendar open={configureOpen} onOpenChange={setConfigureOpen} showDeclined={integration.settings.showDeclinedEvents} />
      ) : null}
      {configureOpen && integration.provider === "zoom" && integration.settings ? (
        <ConfigureZoom open={configureOpen} onOpenChange={setConfigureOpen} mode={integration.settings.defaultCaptureMode} />
      ) : null}
    </li>
  )
}

function ConfigureShell({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  saving,
  error,
  dirty,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onSubmit: () => void
  saving: boolean
  error: unknown
  dirty: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <fieldset disabled={saving} className="grid gap-4">
            {children}
          </fieldset>
          {error ? (
            <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-foreground">
              {getUserMessage(error)} Nothing was changed.
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const calendarSchema = z.object({ showDeclinedEvents: z.boolean() })

function ConfigureCalendar({ open, onOpenChange, showDeclined }: { open: boolean; onOpenChange: (open: boolean) => void; showDeclined: boolean }) {
  const id = useId()
  const configure = useConfigureIntegration("google_calendar")
  const form = useForm<z.infer<typeof calendarSchema>>({
    resolver: zodResolver(calendarSchema),
    defaultValues: { showDeclinedEvents: showDeclined },
  })
  return (
    <ConfigureShell
      open={open}
      onOpenChange={onOpenChange}
      title="Google Calendar"
      description="Choose what appears in your upcoming meetings."
      saving={configure.isPending}
      error={configure.error}
      dirty={form.formState.isDirty}
      onSubmit={() =>
        void form.handleSubmit((values) =>
          configure.mutate(values, {
            onSuccess: () => {
              toast.success("Google Calendar settings saved")
              onOpenChange(false)
            },
          }),
        )()
      }
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="space-y-0.5">
          <Label htmlFor={id}>Show declined events</Label>
          <p id={`${id}-desc`} className="text-sm text-muted-foreground">
            Meetings you declined stay visible in your upcoming list.
          </p>
        </div>
        <Controller
          control={form.control}
          name="showDeclinedEvents"
          render={({ field }) => (
            <Switch id={id} aria-describedby={`${id}-desc`} checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
      </div>
    </ConfigureShell>
  )
}

const zoomSchema = z.object({ defaultCaptureMode: z.enum(CAPTURE_MODES) })

function ConfigureZoom({ open, onOpenChange, mode }: { open: boolean; onOpenChange: (open: boolean) => void; mode: CaptureMode }) {
  const id = useId()
  const configure = useConfigureIntegration("zoom")
  const form = useForm<z.infer<typeof zoomSchema>>({
    resolver: zodResolver(zoomSchema),
    defaultValues: { defaultCaptureMode: mode },
  })
  return (
    <ConfigureShell
      open={open}
      onOpenChange={onOpenChange}
      title="Zoom"
      description="Zoom meetings are still captured only when you start them."
      saving={configure.isPending}
      error={configure.error}
      dirty={form.formState.isDirty}
      onSubmit={() =>
        void form.handleSubmit((values) =>
          configure.mutate(values, {
            onSuccess: () => {
              toast.success("Zoom settings saved")
              onOpenChange(false)
            },
          }),
        )()
      }
    >
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Default capture mode for Zoom</Label>
        <Controller
          control={form.control}
          name="defaultCaptureMode"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={id} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTURE_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {CAPTURE_MODE_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
    </ConfigureShell>
  )
}
