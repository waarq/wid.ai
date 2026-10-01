"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Search } from "lucide-react"

import { Logo } from "@/components/shared/logo"
import { Button } from "@/components/ui/button"
import { useUIStore } from "@/store/ui-store"

import { findNavItem } from "./nav-config"
import { NotificationMenu } from "./notification-menu"
import { ProfileMenu } from "./profile-menu"
import { useModKeyLabel } from "./use-mod-key"

export function Topbar() {
  const pathname = usePathname()
  const section = findNavItem(pathname)
  const nested = section ? pathname !== section.href : false
  const mod = useModKeyLabel()
  const openPalette = useUIStore((s) => s.setCommandPaletteOpen)

  return (
    <header className="sticky top-0 z-30 grid h-12 grid-cols-[1fr_auto] items-center gap-3 border-b border-border bg-background/95 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <span className="md:hidden">
          <Logo href="/my-calls" size="sm" />
        </span>
        {section ? (
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
            <Link
              href={section.href}
              aria-current={nested ? undefined : "page"}
              className={nested ? "text-muted-foreground hover:text-foreground" : "font-medium text-foreground"}
            >
              {section.label}
            </Link>
            {nested ? (
              <>
                <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="truncate font-medium">Details</span>
              </>
            ) : null}
          </nav>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openPalette(true)}
          aria-label="Search"
          aria-keyshortcuts="Control+K Meta+K"
          className="h-8 gap-2 px-2 text-muted-foreground sm:w-52 sm:justify-start"
        >
          <Search aria-hidden />
          <span className="hidden sm:inline">Search</span>
          <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 font-mono text-[11px] sm:inline">
            {mod} K
          </kbd>
        </Button>
        <NotificationMenu />
        <ProfileMenu />
      </div>
    </header>
  )
}
