import type { ReactNode } from "react"

import { GoToShortcuts } from "./go-to-shortcuts"
import { MobileNav } from "./mobile-nav"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

/**
 * Authenticated app frame. Server component composing client leaves.
 *
 *   desktop >= 1024  persistent sidebar (collapsible, remembered)
 *   tablet 768-1023  icon-only sidebar
 *   mobile < 768     topbar + bottom navigation (More opens a drawer)
 *
 * Page content goes in `children`; pages own their PageHeader.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[auto_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-popover px-3 py-2 text-sm shadow-float focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <Topbar />
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12 lg:px-8"
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <GoToShortcuts />
    </div>
  )
}
