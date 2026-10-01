"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useUnreadAlertCount } from "@/hooks"
import { cn } from "@/lib/utils"

import { isActivePath, type NavItem } from "./nav-config"

/** Unread count for the Alerts item. Renders nothing at zero. */
export function useAlertsBadge(item: NavItem): number {
  const { data } = useUnreadAlertCount()
  return item.badge === "alerts" ? (data ?? 0) : 0
}

interface SidebarLinkProps {
  item: NavItem
  /** Persistent collapsed preference (desktop). Tablet is always icon-only via CSS. */
  collapsed: boolean
}

export function SidebarLink({ item, collapsed }: SidebarLinkProps) {
  const pathname = usePathname()
  const active = isActivePath(pathname, item.href)
  const unread = useAlertsBadge(item)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={unread > 0 ? `${item.label}, ${unread} unread` : item.label}
      title={item.label}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px",
        "justify-center",
        !collapsed && "lg:justify-start",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className={cn("truncate", collapsed ? "hidden" : "hidden lg:inline")}>{item.label}</span>
      {unread > 0 ? (
        <>
          <span
            className={cn(
              "ml-auto hidden rounded-full bg-primary px-1.5 font-mono text-[11px] leading-4 text-primary-foreground tabular-nums",
              !collapsed && "lg:inline-block"
            )}
          >
            {unread > 99 ? "99+" : unread}
          </span>
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary",
              !collapsed && "lg:hidden"
            )}
          />
        </>
      ) : null}
    </Link>
  )
}
