import { Check, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { CALENDAR_SCOPES, type CalendarScope } from "@/types"

export const CALENDAR_SCOPE_LABELS: Record<CalendarScope, string> = {
  "events.read": "View your calendar events",
  "titles.read": "Read meeting titles",
  "times.read": "Read meeting times",
  "attendees.read": "Read attendee information",
}

interface CalendarPermissionsPanelProps {
  /** Defaults to every scope WIT requests. */
  scopes?: readonly CalendarScope[]
  className?: string
}

/**
 * "What WIT needs access to", shown before the OAuth consent step so users
 * know exactly what is requested. Server-renderable.
 */
export function CalendarPermissionsPanel({ scopes = CALENDAR_SCOPES, className }: CalendarPermissionsPanelProps) {
  return (
    <section aria-labelledby="calendar-permissions-title" className={cn("grid gap-3", className)}>
      <h2 id="calendar-permissions-title" className="text-sm font-medium text-foreground">
        What WIT needs access to
      </h2>
      <ul className="grid gap-2">
        {scopes.map((scope) => (
          <li key={scope} className="grid grid-cols-[auto_1fr] items-center gap-2.5 text-sm text-foreground">
            <Check aria-hidden className="size-4 text-primary" />
            {CALENDAR_SCOPE_LABELS[scope]}
          </li>
        ))}
      </ul>
      <p className="mt-1 grid grid-cols-[auto_1fr] items-start gap-2.5 text-sm text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
        <span>
          WIT does not automatically record your calendar meetings. Access is read-only: WIT doesn&apos;t create,
          change or delete events.
        </span>
      </p>
    </section>
  )
}
