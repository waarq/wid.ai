"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Laptop, LogOut } from "lucide-react"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { formatRelative } from "@/components/calls/format"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRevokeSession } from "@/hooks"
import type { SecuritySettings } from "@/types"

import { SettingsForm } from "./settings-form"
import { useSectionSave } from "./use-section-save"

const KEEP = "forever"
const RETENTION: ReadonlyArray<{ value: string; label: string }> = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "180 days" },
  { value: "365", label: "1 year" },
  { value: KEEP, label: "Keep until I delete them" },
]

const schema = z.object({ retention: z.string().min(1, "Choose how long to keep recordings.") })
type Values = z.infer<typeof schema>

function retentionValue(days: number | null): string {
  if (days === null) return KEEP
  return RETENTION.some((r) => r.value === String(days)) ? String(days) : KEEP
}

export function SecuritySection({ security }: { security: SecuritySettings }) {
  const retentionId = useId()
  const revoke = useRevokeSession()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { retention: retentionValue(security.recordingRetentionDays) },
  })
  const { save, saving, error, saved } = useSectionSave(form, "Security settings saved")

  return (
    <SettingsForm
      form={form}
      title="Security"
      description="How you sign in, where you are signed in, and how long recordings are kept."
      saving={saving}
      error={error}
      saved={saved}
      onSubmit={(values) =>
        save(
          {
            section: "security",
            patch: { recordingRetentionDays: values.retention === KEEP ? null : Number(values.retention) },
          },
          values,
        )
      }
    >
      <div className="grid gap-1 border-y border-border py-4">
        <h3 className="text-sm font-medium">Sign-in method</h3>
        <p className="text-sm text-muted-foreground">
          You sign in with Google. WID never stores a password, and access is managed in your Google account.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={retentionId}>Recording retention</Label>
        <Controller
          control={form.control}
          name="retention"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={retentionId} className="w-full sm:w-72" aria-describedby={`${retentionId}-hint`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETENTION.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <p id={`${retentionId}-hint`} className="text-sm text-muted-foreground">
          Recordings are deleted after this period. Transcripts and notes are kept.
        </p>
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-medium">Active sessions</h3>
        {security.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other active sessions.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {security.sessions.map((session) => (
              <li key={session.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3">
                <Laptop className="size-4 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {session.device}
                    {session.browser ? `, ${session.browser}` : ""}
                    {session.isCurrent ? <span className="ml-2 text-xs text-primary-ink">This device</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.location ? `${session.location} · ` : ""}
                    <span className="font-mono tabular-nums">Active {formatRelative(session.lastActiveAt)}</span>
                  </p>
                </div>
                {session.isCurrent ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={revoke.isPending && revoke.variables === session.id}
                    onClick={() =>
                      revoke.mutate(session.id, {
                        onSuccess: () => toast.success("Signed out of that device"),
                        onError: () => toast.error("We couldn't sign out that device. Please try again."),
                      })
                    }
                  >
                    <LogOut aria-hidden /> Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsForm>
  )
}
