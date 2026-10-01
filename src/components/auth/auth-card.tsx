import Link from "next/link"

import type { GoogleSignInInput } from "@/types"

import { GoogleSignIn } from "./google-sign-in"

interface AuthCardProps {
  intent: GoogleSignInInput["intent"]
  next?: string | null
}

const COPY = {
  sign_in: {
    title: (
      <>
        Your meetings,
        <br />
        understood.
      </>
    ),
    lead: "Sign in to pick up where your last meeting left off.",
    switchText: "New to WIT?",
    switchLabel: "Create an account",
    switchHref: "/register",
  },
  register: {
    title: "Create your WIT account",
    lead: "Notes, decisions and follow-ups from the meetings you choose to capture.",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/login",
  },
} as const

/** Server-rendered sign-in / sign-up body. Only the Google button is a client leaf. */
export function AuthCard({ intent, next }: AuthCardProps) {
  const copy = COPY[intent]
  const switchHref = next ? `${copy.switchHref}?${new URLSearchParams({ next }).toString()}` : copy.switchHref

  return (
    <div className="grid w-full max-w-sm gap-10">
      <div className="grid gap-3">
        <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance text-foreground sm:text-[2.5rem]">
          {copy.title}
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">{copy.lead}</p>
      </div>

      <div className="grid gap-6">
        <GoogleSignIn intent={intent} next={next} />
        <div className="border-t border-border" />
        <p className="text-sm text-muted-foreground">
          By continuing, you agree to WIT&apos;s{" "}
          <Link href="/terms" className="text-foreground underline underline-offset-4 hover:text-primary">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-foreground underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.switchText}{" "}
        <Link href={switchHref} className="font-medium text-foreground underline-offset-4 hover:underline">
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  )
}
