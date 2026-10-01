"use client"

import { Loader2, TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { useSignIn } from "@/hooks"
import { isRealAuth } from "@/services/modes"
import type { GoogleSignInInput } from "@/types"

import { GoogleAccountChooser } from "./google-account-chooser"
import { GoogleMark } from "./google-mark"

interface GoogleSignInProps {
  intent: GoogleSignInInput["intent"]
  next?: string | null
}

const BUTTON_CLASS =
  "h-11 w-full gap-2.5 border-border-strong bg-card text-[0.9375rem] hover:bg-accent active:translate-y-[1px] active:scale-[0.99]"

/**
 * "Continue with Google". Mock auth opens WID's demo account chooser; real
 * auth (no accounts to list) goes straight to Google's own chooser.
 */
export function GoogleSignIn(props: GoogleSignInProps) {
  return isRealAuth ? <RedirectGoogleSignIn {...props} /> : <MockGoogleSignIn {...props} />
}

function MockGoogleSignIn({ intent, next }: GoogleSignInProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={BUTTON_CLASS}
      >
        <GoogleMark />
        Continue with Google
      </Button>
      <GoogleAccountChooser open={open} onOpenChange={setOpen} intent={intent} next={next} />
    </>
  )
}

/*
 * Real OAuth: signInWithGoogle() navigates the page to Google and its promise
 * never resolves, so "pending" means "redirecting". The /auth/callback route
 * finishes sign-in and routes by stage.
 */
function RedirectGoogleSignIn({ intent, next }: GoogleSignInProps) {
  const signIn = useSignIn()
  const { reset } = signIn

  // Coming back with the browser's Back button restores this page from the
  // back/forward cache with the pending state frozen. Re-enable the button.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) reset()
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [reset])

  const redirecting = signIn.isPending

  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={redirecting}
        aria-busy={redirecting || undefined}
        onClick={() => signIn.mutate({ intent, next })}
        className={BUTTON_CLASS}
      >
        {redirecting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <GoogleMark />}
        {redirecting ? "Redirecting to Google…" : "Continue with Google"}
      </Button>
      <p className="sr-only" role="status" aria-live="polite">
        {redirecting ? "Redirecting to Google" : ""}
      </p>
      {signIn.isError ? (
        <p
          role="alert"
          className="grid grid-cols-[auto_1fr] items-start gap-2 rounded-md bg-destructive-soft px-3 py-2 text-sm text-foreground"
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 text-destructive" />
          <span>We couldn&apos;t start Google sign-in. {signIn.error.message}</span>
        </p>
      ) : null}
    </div>
  )
}
