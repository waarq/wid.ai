"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { authNav, primaryNav } from "../content/navigation"
import { ThemeToggle } from "./theme-toggle"

/** Hamburger and drawer. Radix Dialog supplies the focus trap and Escape handling. */
export function MobileNav() {
  const pathname = usePathname()
  // The drawer is open only for the path it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname

  return (
    <Sheet open={open} onOpenChange={(next) => setOpenOn(next ? pathname : null)}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
          <Menu aria-hidden className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(88vw,22rem)] gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border p-5 pr-14">
          <SheetTitle className="text-base font-semibold tracking-tight">WID</SheetTitle>
          <SheetDescription className="text-sm">AI meeting intelligence</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-1 flex-col overflow-y-auto p-2">
          {primaryNav.map((item) => (
            <SheetClose asChild key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-12 items-center rounded-md px-3 text-base font-medium text-foreground transition-colors hover:bg-muted"
              >
                {item.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="grid gap-2 border-t border-border p-5">
          <SheetClose asChild>
            <Button asChild size="lg" className="h-10 text-sm">
              <Link href={authNav.register.href}>{authNav.register.label}</Link>
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button asChild variant="outline" size="lg" className="h-10 text-sm">
              <Link href={authNav.login.href}>{authNav.login.label}</Link>
            </Button>
          </SheetClose>
          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
