"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ChevronRight, CircleCheck, Loader2, TriangleAlert, UserRoundPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useGoogleAccounts, useSignIn } from "@/hooks"
import { getPostAuthPath } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { otherGoogleAccountSchema, type OtherGoogleAccountValues } from "@/lib/validation/auth"
import type { AuthResult, GoogleAccountOption, GoogleSignInInput } from "@/types"

import { GoogleMark } from "./google-mark"

/** How long the welcome line stays before routing on. */
const WELCOME_HOLD_MS = 1100

type View = "choose" | "other" | "welcome"

interface GoogleAccountChooserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intent: GoogleSignInInput["intent"]
  /** Safe-checked `next` from the URL; only honoured for app routes. */
  next?: string | null
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

/*
 * WIT's own account chooser for "Continue with Google". It simulates the
 * account-selection step without copying Google's UI. With real OAuth,
 * listGoogleAccounts() may return [] and the provider's chooser takes over.
 */
export function GoogleAccountChooser({ open, onOpenChange, intent, next }: GoogleAccountChooserProps) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const accounts = useGoogleAccounts({ enabled: open })
  const signIn = useSignIn()
  const [view, setView] = useState<View>("choose")
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [lastInput, setLastInput] = useState<GoogleSignInInput | null>(null)
  const [result, setResult] = useState<AuthResult | null>(null)
  const routeTimer = useRef<number | null>(null)

  const busy = signIn.isPending || view === "welcome"

  useEffect(() => {
    return () => {
      if (routeTimer.current) window.clearTimeout(routeTimer.current)
    }
  }, [])

  function handleOpenChange(nextOpen: boolean) {
    // The sign-in can't be cancelled mid-flight; closing is blocked until it settles.
    if (busy) return
    if (!nextOpen) {
      setView("choose")
      signIn.reset()
      setPendingKey(null)
    }
    onOpenChange(nextOpen)
  }

  function start(input: GoogleSignInInput, key: string) {
    setPendingKey(key)
    setLastInput(input)
    signIn.mutate(input, {
      onSuccess: (authResult) => {
        setResult(authResult)
        setView("welcome")
        const path = getPostAuthPath(authResult.session.stage, next)
        router.prefetch(path)
        routeTimer.current = window.setTimeout(() => router.replace(path), WELCOME_HOLD_MS)
      },
      onSettled: () => setPendingKey(null),
    })
  }

  function chooseAccount(account: GoogleAccountOption) {
    start({ intent, accountId: account.id, loginHint: account.email }, account.id)
  }

  const accountList = accounts.data ?? []
  const transition = { type: "spring" as const, stiffness: 260, damping: 26 }
  const slide = (dir: 1 | -1) => ({
    initial: { opacity: 0, x: reduceMotion ? 0 : 12 * dir },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduceMotion ? 0 : -12 * dir },
    transition,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!busy}
        className="gap-0 overflow-hidden p-0 sm:max-w-[420px]"
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
        onInteractOutside={(event) => busy && event.preventDefault()}
      >
        <AnimatePresence mode="wait" initial={false}>
          {view === "welcome" && result ? (
            <motion.div key="welcome" {...slide(1)} className="grid gap-4 px-6 py-10" role="status">
              <motion.span
                aria-hidden
                initial={{ scale: reduceMotion ? 1 : 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="grid size-9 place-items-center rounded-full bg-primary-soft text-primary-ink"
              >
                <CircleCheck className="size-5" />
              </motion.span>
              <DialogHeader className="gap-1">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  {result.session.stage === "ready" ? "Welcome back" : "Welcome"}, {result.session.user.firstName}.
                </DialogTitle>
                <DialogDescription className="text-base">
                  {result.session.stage === "ready" ? "Opening your meetings." : "Let's set up WIT."}
                </DialogDescription>
              </DialogHeader>
              <div className="h-0.5 w-full overflow-hidden rounded-full bg-border" aria-hidden>
                <motion.div
                  className="h-full w-full origin-left bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: reduceMotion ? 0 : WELCOME_HOLD_MS / 1000, ease: "easeOut" }}
                />
              </div>
            </motion.div>
          ) : view === "other" ? (
            <motion.div key="other" {...slide(1)}>
              <OtherAccountForm
                pending={signIn.isPending}
                onBack={() => {
                  signIn.reset()
                  setView("choose")
                }}
                onSubmit={(values) => start({ intent, loginHint: values.email }, "other")}
                error={signIn.isError ? signIn.error.message : null}
              />
            </motion.div>
          ) : (
            <motion.div key="choose" {...slide(-1)}>
              <DialogHeader className="gap-1.5 border-b border-border px-5 pt-5 pb-4">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GoogleMark className="size-3.5" />
                  Continue with Google
                </p>
                <DialogTitle className="text-lg font-semibold tracking-tight">Select an account</DialogTitle>
                <DialogDescription>
                  The account you choose becomes your WIT profile. Demo accounts, no real Google sign-in.
                </DialogDescription>
              </DialogHeader>

              {signIn.isError ? (
                <div
                  role="alert"
                  className="grid grid-cols-[auto_1fr] items-start gap-3 border-b border-border bg-destructive-soft px-5 py-3 text-sm"
                >
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 text-destructive" />
                  <div className="grid gap-2">
                    <p className="text-foreground">
                      We couldn&apos;t sign you in with Google. Nothing was changed. {signIn.error.message}
                    </p>
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="bg-background"
                        onClick={() => lastInput && start(lastInput, lastInput.accountId ?? "other")}
                      >
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid py-1.5" aria-busy={accounts.isPending || undefined}>
                {accounts.isPending ? (
                  <div className="grid gap-1 px-5 py-2" aria-label="Loading accounts">
                    {[0, 1].map((i) => (
                      <div key={i} className="grid grid-cols-[auto_1fr] items-center gap-3 py-2">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="grid gap-1.5">
                          <Skeleton className="h-3.5 w-28" />
                          <Skeleton className="h-3 w-44" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : accounts.isError ? (
                  <div role="alert" className="grid gap-2 px-5 py-4 text-sm">
                    <p className="text-foreground">We couldn&apos;t load your Google accounts.</p>
                    <div>
                      <Button type="button" variant="outline" size="sm" onClick={() => accounts.refetch()}>
                        Try again
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ul className="grid" aria-label="Google accounts">
                    {accountList.map((account) => (
                      <li key={account.id}>
                        <AccountRow
                          name={account.name}
                          detail={account.email}
                          avatar={initials(account.name)}
                          pending={pendingKey === account.id}
                          disabled={busy}
                          onClick={() => chooseAccount(account)}
                        />
                      </li>
                    ))}
                    {accountList.length === 0 ? (
                      <li>
                        <AccountRow
                          name="Continue to Google"
                          detail="Choose an account on Google's sign-in page"
                          avatar={<GoogleMark />}
                          pending={pendingKey === "provider"}
                          disabled={busy}
                          onClick={() => start({ intent }, "provider")}
                        />
                      </li>
                    ) : null}
                    <li className="mt-1.5 border-t border-border pt-1.5">
                      <AccountRow
                        name="Use another account"
                        avatar={<UserRoundPlus className="size-4" aria-hidden />}
                        disabled={busy}
                        onClick={() => {
                          signIn.reset()
                          setView("other")
                        }}
                      />
                    </li>
                  </ul>
                )}
              </div>

              <div className="flex justify-end border-t border-border px-5 py-3">
                <Button type="button" variant="ghost" disabled={busy} onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

interface AccountRowProps {
  name: string
  detail?: string
  avatar: ReactNode
  pending?: boolean
  disabled?: boolean
  onClick: () => void
}

function AccountRow({ name, detail, avatar, pending, disabled, onClick }: AccountRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={pending || undefined}
      className={cn(
        "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-2.5 text-left outline-none transition-colors",
        "hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-accent",
        "disabled:cursor-not-allowed",
        disabled && !pending && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium text-foreground"
      >
        {avatar}
      </span>
      <span className="grid min-w-0">
        <span className="truncate text-sm font-medium text-foreground">{name}</span>
        {detail ? <span className="truncate text-sm text-muted-foreground">{detail}</span> : null}
      </span>
      {pending ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
          Signing in
        </span>
      ) : (
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      )}
    </button>
  )
}

interface OtherAccountFormProps {
  pending: boolean
  error: string | null
  onBack: () => void
  onSubmit: (values: OtherGoogleAccountValues) => void
}

function OtherAccountForm({ pending, error, onBack, onSubmit }: OtherAccountFormProps) {
  const emailId = useId()
  const hintId = useId()
  const errorId = useId()
  const form = useForm<OtherGoogleAccountValues>({
    resolver: zodResolver(otherGoogleAccountSchema),
    defaultValues: { email: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  })
  const fieldError = form.formState.errors.email?.message

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid">
      <DialogHeader className="gap-1.5 border-b border-border px-5 pt-5 pb-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <GoogleMark className="size-3.5" />
          Continue with Google
        </p>
        <DialogTitle className="text-lg font-semibold tracking-tight">Use another account</DialogTitle>
        <DialogDescription>Enter the Google account email you want to use with WIT.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-2 px-5 py-5">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          disabled={pending}
          aria-invalid={Boolean(fieldError) || undefined}
          aria-describedby={fieldError ? errorId : hintId}
          className="h-9"
          {...form.register("email")}
        />
        {fieldError ? (
          <p id={errorId} className="text-sm text-destructive">
            {fieldError}
          </p>
        ) : (
          <p id={hintId} className="text-sm text-muted-foreground">
            Demo mode creates a sample profile for this email.
          </p>
        )}
        {error ? (
          <p role="alert" className="mt-1 rounded-md bg-destructive-soft px-3 py-2 text-sm text-foreground">
            We couldn&apos;t sign you in with Google. {error}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="ghost" disabled={pending} onClick={onBack} className="-ml-2.5">
          <ArrowLeft aria-hidden />
          Back
        </Button>
        <span />
        <Button type="submit" disabled={pending} className="min-w-24 px-3">
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {pending ? "Signing in" : error ? "Try again" : "Continue"}
        </Button>
      </div>
    </form>
  )
}
