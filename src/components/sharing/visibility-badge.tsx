import { Building2, Link2, Lock, Users, type LucideIcon } from "lucide-react"

import { VISIBILITY_LABEL } from "@/components/calls/meeting-utils"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { MeetingVisibility } from "@/types"

const ICON: Record<MeetingVisibility, LucideIcon> = {
  private: Lock,
  attendees: Users,
  team: Building2,
}

/**
 * The meeting's sharing state. Rendered on every meeting surface: the PRD
 * says visibility is never hidden. `linkEnabled` adds "link on" when the
 * workspace allows "Anyone with the link" and it is switched on.
 */
export function VisibilityBadge({
  visibility,
  linkEnabled = false,
  className,
}: {
  visibility: MeetingVisibility
  linkEnabled?: boolean
  className?: string
}) {
  const Icon = linkEnabled ? Link2 : ICON[visibility]
  const label = linkEnabled ? "Anyone with the link" : VISIBILITY_LABEL[visibility]
  return (
    <Badge
      variant={visibility === "private" && !linkEnabled ? "muted" : "info"}
      className={cn("gap-1", className)}
      data-visibility={visibility}
    >
      <Icon aria-hidden />
      <span>
        <span className="sr-only">Visibility: </span>
        {label}
      </span>
    </Badge>
  )
}
