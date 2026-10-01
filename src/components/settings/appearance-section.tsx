"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { toast } from "sonner"

import { OptionRadioGroup } from "@/components/onboarding/option-list"
import type { OptionCopy } from "@/components/onboarding/options"
import { useUpdateSettings } from "@/hooks"
import type { AppearanceSettings, ThemePreference } from "@/types"

import { SectionHeading } from "./settings-form"

const THEME_OPTIONS: OptionCopy<ThemePreference>[] = [
  { value: "light", label: "Light", description: "Warm off-white surfaces.", icon: Sun },
  { value: "dark", label: "Dark", description: "Tinted near-black surfaces.", icon: Moon },
  { value: "system", label: "System", description: "Follow your device setting.", icon: Monitor },
]

/**
 * Appearance applies instantly through next-themes (the live source of truth
 * on this device) and is mirrored to your saved settings, so there is no
 * unsaved state to manage.
 */
export function AppearanceSection({ appearance }: { appearance: AppearanceSettings }) {
  const { theme, setTheme } = useTheme()
  const update = useUpdateSettings()
  // false during SSR/hydration so the server markup matches, true afterwards.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const current: ThemePreference =
    mounted && (theme === "light" || theme === "dark" || theme === "system") ? theme : appearance.theme

  function choose(next: ThemePreference) {
    const previous = current
    setTheme(next)
    update.mutate(
      { section: "appearance", patch: { theme: next } },
      {
        onSuccess: () => toast.success("Theme updated"),
        onError: () => {
          setTheme(previous)
          toast.error("We couldn't save your theme. It was reverted.")
        },
      },
    )
  }

  return (
    <div className="grid gap-6">
      <SectionHeading title="Appearance" description="How WIT looks on your devices." />
      <div className="grid gap-2">
        <p id="theme-label" className="text-sm font-medium">
          Theme
        </p>
        <OptionRadioGroup options={THEME_OPTIONS} value={current} onValueChange={choose} labelledBy="theme-label" disabled={update.isPending} />
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {update.isPending ? "Saving…" : "Changes apply immediately."}
        </p>
      </div>
    </div>
  )
}
