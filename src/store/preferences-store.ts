import { create } from "zustand"
import { persist } from "zustand/middleware"

import { safeLocalStorage } from "./storage"

/*
 * Local, per-device UI preferences. Theme lives in next-themes and synced
 * settings (Settings.appearance) live in TanStack Query; this store is only
 * for presentation choices that never need to reach the backend.
 */

export type CollectionView = "list" | "grid"
export type DealsView = "list" | "board"
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

export interface PreferencesState {
  meetingsView: CollectionView
  teamCallsView: CollectionView
  dealsView: DealsView
  playbackRate: PlaybackRate
  /** 0..1 */
  volume: number
  transcriptAutoScroll: boolean
  /** Meeting Brief section ids the user collapsed ("risks", "topics", ...). */
  collapsedBriefSections: string[]

  setMeetingsView: (view: CollectionView) => void
  setTeamCallsView: (view: CollectionView) => void
  setDealsView: (view: DealsView) => void
  setPlaybackRate: (rate: PlaybackRate) => void
  setVolume: (volume: number) => void
  setTranscriptAutoScroll: (enabled: boolean) => void
  toggleBriefSection: (sectionId: string) => void
  resetPreferences: () => void
}

type PersistedPreferences = Omit<
  PreferencesState,
  | "setMeetingsView"
  | "setTeamCallsView"
  | "setDealsView"
  | "setPlaybackRate"
  | "setVolume"
  | "setTranscriptAutoScroll"
  | "toggleBriefSection"
  | "resetPreferences"
>

export const PREFERENCES_STORE_VERSION = 1

const defaults: PersistedPreferences = {
  meetingsView: "list",
  teamCallsView: "list",
  dealsView: "list",
  playbackRate: 1,
  volume: 1,
  transcriptAutoScroll: true,
  collapsedBriefSections: [],
}

function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1
}

function sanitize(raw: Partial<PersistedPreferences> | undefined): PersistedPreferences {
  const value = raw ?? {}
  const view = (v: unknown): CollectionView | undefined => (v === "list" || v === "grid" ? v : undefined)
  return {
    meetingsView: view(value.meetingsView) ?? defaults.meetingsView,
    teamCallsView: view(value.teamCallsView) ?? defaults.teamCallsView,
    dealsView: value.dealsView === "board" || value.dealsView === "list" ? value.dealsView : defaults.dealsView,
    playbackRate: (PLAYBACK_RATES as readonly number[]).includes(value.playbackRate as number)
      ? (value.playbackRate as PlaybackRate)
      : defaults.playbackRate,
    volume: typeof value.volume === "number" ? clampVolume(value.volume) : defaults.volume,
    transcriptAutoScroll:
      typeof value.transcriptAutoScroll === "boolean" ? value.transcriptAutoScroll : defaults.transcriptAutoScroll,
    collapsedBriefSections: Array.isArray(value.collapsedBriefSections)
      ? value.collapsedBriefSections.filter((id): id is string => typeof id === "string").slice(0, 20)
      : defaults.collapsedBriefSections,
  }
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaults,
      setMeetingsView: (meetingsView) => set({ meetingsView }),
      setTeamCallsView: (teamCallsView) => set({ teamCallsView }),
      setDealsView: (dealsView) => set({ dealsView }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setVolume: (volume) => set({ volume: clampVolume(volume) }),
      setTranscriptAutoScroll: (transcriptAutoScroll) => set({ transcriptAutoScroll }),
      toggleBriefSection: (sectionId) =>
        set((s) => ({
          collapsedBriefSections: s.collapsedBriefSections.includes(sectionId)
            ? s.collapsedBriefSections.filter((id) => id !== sectionId)
            : [...s.collapsedBriefSections, sectionId],
        })),
      resetPreferences: () => set({ ...defaults, collapsedBriefSections: [] }),
    }),
    {
      name: "wit-preferences",
      version: PREFERENCES_STORE_VERSION,
      storage: safeLocalStorage<PersistedPreferences>(),
      partialize: (s): PersistedPreferences => ({
        meetingsView: s.meetingsView,
        teamCallsView: s.teamCallsView,
        dealsView: s.dealsView,
        playbackRate: s.playbackRate,
        volume: s.volume,
        transcriptAutoScroll: s.transcriptAutoScroll,
        collapsedBriefSections: s.collapsedBriefSections,
      }),
      migrate: () => ({ ...defaults }),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted as Partial<PersistedPreferences>) }),
      skipHydration: true,
    },
  ),
)

/* Selectors */

export const selectMeetingsView = (s: PreferencesState): CollectionView => s.meetingsView
export const selectTeamCallsView = (s: PreferencesState): CollectionView => s.teamCallsView
export const selectDealsView = (s: PreferencesState): DealsView => s.dealsView
export const selectPlaybackRate = (s: PreferencesState): PlaybackRate => s.playbackRate
export const selectVolume = (s: PreferencesState): number => s.volume
export const selectTranscriptAutoScroll = (s: PreferencesState): boolean => s.transcriptAutoScroll
export const selectIsBriefSectionCollapsed =
  (sectionId: string) =>
  (s: PreferencesState): boolean =>
    s.collapsedBriefSections.includes(sectionId)
