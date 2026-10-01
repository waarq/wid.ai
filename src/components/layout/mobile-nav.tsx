"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Ellipsis, LifeBuoy } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useUnreadAlertCount } from "@/hooks"
import { cn } from "@/lib/utils"
import { useUIStore } from "@/store/ui-store"

import { MOBILE_MORE_NAV, MOBILE_TAB_NAV, isActivePath } from "./nav-config"

const tabClass =
  "relative grid min-h-12 place-items-center gap-0.5 px-1 py-1.5 text-[10px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-sidebar-accent"

export function MobileNav() {
  const pathname = usePathname()
  const open = useUIStore((s) => s.mobileNavOpen)
  const setOpen = useUIStore((s) => s.setMobileNavOpen)
  const { data: unread = 0 } = useUnreadAlertCount()
  const moreActive = MOBILE_MORE_NAV.some((item) => isActivePath(pathname, item.href))

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MOBILE_TAB_NAV.map((item) => {
          const active = isActivePath(pathname, item.href)
          const Icon = item.icon
          const showDot = item.badge === "alerts" && unread > 0
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(tabClass, active ? "text-primary" : "text-muted-foreground")}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {showDot ? (
                  <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
                ) : null}
              </span>
              <span>{item.label}</span>
              {showDot ? <span className="sr-only">{unread} unread</span> : null}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={cn(tabClass, moreActive ? "text-primary" : "text-muted-foreground")}
        >
          <Ellipsis className="size-5" aria-hidden />
          <span>More</span>
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription className="sr-only">Other sections of WID</SheetDescription>
          </SheetHeader>
          <ul className="divide-y divide-border px-4">
            {[...MOBILE_MORE_NAV, { href: "/help", label: "Help", icon: LifeBuoy }].map((item) => {
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}
