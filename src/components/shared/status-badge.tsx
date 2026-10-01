import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MeetingStatus } from "@/types"

/** Canonical server-side meeting lifecycle from `@/types`. */
export type StatusBadgeStatus = MeetingStatus

type Tone = "muted" | "success" | "warning" | "info" | "danger"

const STATUS: Record<
  StatusBadgeStatus,
  { label: string; tone: Tone; pulse?: boolean }
> = {
  upcoming: { label: "Upcoming", tone: "muted" },
  ready_to_capture: { label: "Ready to capture", tone: "success" },
  capturing: { label: "Capturing", tone: "danger", pulse: true },
  paused: { label: "Paused", tone: "warning" },
  processing: { label: "Processing", tone: "info", pulse: true },
  transcribing: { label: "Transcribing", tone: "info", pulse: true },
  understanding: { label: "Understanding", tone: "info", pulse: true },
  ready: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
}

const DOT: Record<Tone, string> = {
  muted: "bg-status-upcoming",
  success: "bg-status-ready",
  warning: "bg-status-paused",
  info: "bg-status-processing",
  danger: "bg-status-capturing",
}

interface StatusBadgeProps {
  status: StatusBadgeStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { label, tone, pulse } = STATUS[status]
  return (
    <Badge variant={tone} className={cn("gap-1.5", className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          DOT[tone],
          pulse && "motion-safe:animate-pulse"
        )}
      />
      {label}
    </Badge>
  )
}
