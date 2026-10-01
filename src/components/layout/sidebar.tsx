"use client"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui-store"

import { PRIMARY_NAV, SECONDARY_NAV } from "./nav-config"
import { SidebarLink } from "./nav-link"

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggle = useUIStore((s) => s.toggleSidebar)

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:w-14",
        "transition-[width] duration-200 ease-out",
        collapsed ? "lg:w-14" : "lg:w-60"
      )}
    >
      <div className="flex h-12 items-center justify-center border-b border-sidebar-border px-2">
        <Logo href="/my-calls" size="sm" />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {PRIMARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} collapsed={collapsed} />
        ))}
        <div role="separator" className="my-2 border-t border-sidebar-border" />
        {SECONDARY_NAV.map((item) => (
          <SidebarLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="hidden border-t border-sidebar-border p-2 lg:block">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn("w-full text-muted-foreground", collapsed ? "justify-center" : "justify-start")}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden />
          ) : (
            <>
              <PanelLeftClose aria-hidden />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
