"use client"

import { UrlFilterChips } from "@/components/shared/url-filter-chips"

import { TEAM_MEMBERS, type TeamMember } from "./filters"
import { ViewToggle } from "./meeting-filters"
import { useCollectionView } from "./use-collection-view"

export function TeamCallsToolbar({ member }: { member: TeamMember }) {
  const [view, setView] = useCollectionView("team")
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
      <UrlFilterChips param="member" options={TEAM_MEMBERS} value={member} label="Whose meetings" />
      <ViewToggle view={view} onChange={setView} />
    </div>
  )
}
