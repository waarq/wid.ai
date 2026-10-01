"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import type { GoogleSignInInput } from "@/types"

import { GoogleAccountChooser } from "./google-account-chooser"
import { GoogleMark } from "./google-mark"

interface GoogleSignInProps {
  intent: GoogleSignInInput["intent"]
  next?: string | null
}

/** "Continue with Google" button plus the account chooser it opens. */
export function GoogleSignIn({ intent, next }: GoogleSignInProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="h-11 w-full gap-2.5 border-border-strong bg-card text-[0.9375rem] hover:bg-accent active:translate-y-[1px] active:scale-[0.99]"
      >
        <GoogleMark />
        Continue with Google
      </Button>
      <GoogleAccountChooser open={open} onOpenChange={setOpen} intent={intent} next={next} />
    </>
  )
}
