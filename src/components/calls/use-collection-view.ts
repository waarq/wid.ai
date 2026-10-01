"use client"

import { useStoreHydration } from "@/store/hydration"
import { usePreferencesStore, type CollectionView } from "@/store/preferences-store"

/**
 * List/grid preference, persisted per device. Server markup and the first
 * client render always use "list"; the stored value applies after hydration.
 */
export function useCollectionView(kind: "meetings" | "team"): [CollectionView, (view: CollectionView) => void] {
  const hydrated = useStoreHydration(usePreferencesStore)
  const stored = usePreferencesStore((s) => (kind === "meetings" ? s.meetingsView : s.teamCallsView))
  const setMeetings = usePreferencesStore((s) => s.setMeetingsView)
  const setTeam = usePreferencesStore((s) => s.setTeamCallsView)
  return [hydrated ? stored : "list", kind === "meetings" ? setMeetings : setTeam]
}
