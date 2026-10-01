import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Set up WIT",
  description: "Connect your calendar and tell WIT what matters to you.",
  robots: { index: false },
}

/*
 * Onboarding has its own chrome (OnboardingShell), deliberately unlike the
 * app shell. Providers come from the root layout.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>
}
