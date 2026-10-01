import { initials, pluralize } from "@/components/calls/format"
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar"
import type { PersonRef } from "@/types"

export function ParticipantAvatars({
  people,
  max = 3,
  withCount = false,
}: {
  people: readonly PersonRef[]
  max?: number
  withCount?: boolean
}) {
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  return (
    <span className="inline-flex items-center gap-2">
      <AvatarGroup aria-hidden>
        {shown.map((p) => (
          <Avatar key={p.id} size="sm">
            {p.avatarUrl ? <AvatarImage src={p.avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials(p.name)}</AvatarFallback>
          </Avatar>
        ))}
        {extra > 0 ? <AvatarGroupCount>+{extra}</AvatarGroupCount> : null}
      </AvatarGroup>
      <span className={withCount ? "text-xs text-muted-foreground" : "sr-only"}>
        {pluralize(people.length, "participant")}
      </span>
    </span>
  )
}
