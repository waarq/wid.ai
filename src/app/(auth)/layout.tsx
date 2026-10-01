import type { ReactNode } from "react"
import { CalendarDays, Hand, Lock } from "lucide-react"

import { Logo } from "@/components/shared/logo"
import { isRealAuth } from "@/services/modes"

const PROMISES = [
  {
    icon: Hand,
    title: "You start every capture",
    body: "WID never records a meeting on its own. Connecting a calendar only shows what's coming up.",
  },
  {
    icon: Lock,
    title: "Private by default",
    body: "Meeting notes stay with you until you choose to share them.",
  },
  {
    icon: CalendarDays,
    title: "Two minutes to set up",
    body: "Pick an account, connect your calendar if you like, and tell WID what matters to you.",
  },
] as const

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-background lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="grid grid-rows-[auto_1fr_auto] px-5 py-6 sm:px-10 lg:px-16">
        <header>
          <Logo href="/" />
        </header>
        <main className="grid content-center py-16 sm:py-20">{children}</main>
        <footer className="text-xs text-muted-foreground">
          {isRealAuth
            ? "Sign-in uses your Google account. WID only asks for your name and email."
            : "Demo environment. Accounts and meetings are fictional."}
        </footer>
      </div>

      <aside
        aria-label="What to expect"
        className="hidden border-l border-border bg-card px-12 py-6 lg:grid lg:grid-rows-[1fr_auto] xl:px-16"
      >
        <div className="grid max-w-sm content-center gap-10">
          <p className="text-sm font-medium text-muted-foreground">What to expect</p>
          <ol className="grid gap-8">
            {PROMISES.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="grid grid-cols-[auto_1fr] gap-4">
                <span className="num pt-0.5 text-xs text-muted-foreground">0{index + 1}</span>
                <div className="grid gap-1.5">
                  <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Icon aria-hidden className="size-4 text-primary" />
                    {title}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-muted-foreground">WID works with Google Calendar and Zoom.</p>
      </aside>
    </div>
  )
}
