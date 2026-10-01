import {
  AudioLines,
  Bell,
  CircleUser,
  Handshake,
  ListMusic,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Shows the unread alerts badge. */
  badge?: "alerts"
}

/** Main sections, in sidebar order. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { href: "/my-calls", label: "My Calls", icon: AudioLines },
  { href: "/team-calls", label: "Team Calls", icon: Users },
  { href: "/playlist", label: "Playlist", icon: ListMusic },
  { href: "/alerts", label: "Alerts", icon: Bell, badge: "alerts" },
  { href: "/deals", label: "Deals", icon: Handshake },
]

/** Below the divider. */
export const SECONDARY_NAV: readonly NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: CircleUser },
]

export const ALL_NAV: readonly NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV]

/** Mobile bottom bar shows these; everything else lives in the "More" drawer. */
export const MOBILE_TAB_NAV: readonly NavItem[] = PRIMARY_NAV.slice(0, 4)
export const MOBILE_MORE_NAV: readonly NavItem[] = [PRIMARY_NAV[4]!, ...SECONDARY_NAV]

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV.find((item) => isActivePath(pathname, item.href))
}

export const KEYBOARD_SHORTCUTS: ReadonlyArray<{ keys: string[]; label: string }> = [
  { keys: ["mod", "K"], label: "Open command palette" },
  { keys: ["G", "M"], label: "Go to My Calls" },
  { keys: ["G", "T"], label: "Go to Team Calls" },
  { keys: ["G", "P"], label: "Go to Playlist" },
  { keys: ["G", "A"], label: "Go to Alerts" },
  { keys: ["Esc"], label: "Close dialogs and menus" },
]
