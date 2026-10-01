import {
  Bell,
  Bot,
  Calendar,
  Lock,
  Palette,
  Plug,
  Radio,
  Settings2,
  Share2,
  type LucideIcon,
} from "lucide-react"

import { SETTINGS_SECTIONS, type SettingsSectionId } from "@/types"

export const SECTION_META: Record<SettingsSectionId, { label: string; icon: LucideIcon }> = {
  general: { label: "General", icon: Settings2 },
  meetings: { label: "Meetings", icon: Calendar },
  capture: { label: "Capture", icon: Radio },
  sharing: { label: "Sharing", icon: Share2 },
  ai: { label: "AI & Understanding", icon: Bot },
  notifications: { label: "Notifications", icon: Bell },
  integrations: { label: "Integrations", icon: Plug },
  security: { label: "Security", icon: Lock },
  appearance: { label: "Appearance", icon: Palette },
}

export function parseSection(raw: string | string[] | undefined): SettingsSectionId {
  const value = Array.isArray(raw) ? raw[0] : raw
  return SETTINGS_SECTIONS.find((s) => s === value) ?? "general"
}

export function sectionHref(section: SettingsSectionId): string {
  return section === "general" ? "/settings" : `/settings?section=${section}`
}
