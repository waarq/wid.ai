"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { APP_HOME_PATH } from "@/lib/auth/routes"
import type { OnboardingData } from "@/types"

import { CAPTURE_PREFERENCE_SHORT, MEETING_FOCUS_SHORT, SHARING_SHORT } from "./options"

interface OnboardingCompleteProps {
  data: Pick<
    OnboardingData,
    "calendarConnected" | "capturePreference" | "sharingPreference" | "meetingFocus" | "zoomConnected" | "firstName"
  >
}

/** "You're ready." Subtle check draw + staggered summary; no confetti. */
export function OnboardingComplete({ data }: OnboardingCompleteProps) {
  const reduceMotion = useReducedMotion()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const focus = data.meetingFocus.map((f) => MEETING_FOCUS_SHORT[f])
  const rows = [
    { label: "Calendar", value: data.calendarConnected ? "Connected" : "Not connected", ok: data.calendarConnected },
    { label: "Capture", value: CAPTURE_PREFERENCE_SHORT[data.capturePreference], ok: true },
    { label: "Sharing", value: SHARING_SHORT[data.sharingPreference], ok: true },
    {
      label: "Focus",
      value: focus.length > 0 ? (focus.length > 4 ? `${focus.slice(0, 4).join(" · ")} +${focus.length - 4}` : focus.join(" · ")) : "None yet",
      ok: focus.length > 0,
    },
    { label: "Zoom", value: data.zoomConnected ? "Connected" : "Skipped", ok: data.zoomConnected },
  ]

  const spring = { type: "spring" as const, stiffness: 220, damping: 26 }

  return (
    <div className="grid gap-10">
      <div className="grid gap-5">
        <motion.span
          aria-hidden
          initial={{ scale: reduceMotion ? 1 : 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 20 }}
          className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary-ink"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduceMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : 0.15, ease: "easeOut" }}
            />
          </svg>
        </motion.span>
        <div className="grid gap-2">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-[2rem] leading-tight font-semibold tracking-tight text-foreground outline-none"
          >
            You&apos;re ready.
          </h1>
          <p className="text-[0.9375rem] text-muted-foreground">
            WIT is set up for you{data.firstName ? `, ${data.firstName}` : ""}. Nothing is captured until you start
            it.
          </p>
        </div>
      </div>

      <dl className="grid border-t border-border">
        {rows.map((row, index) => (
          <motion.div
            key={row.label}
            initial={{ opacity: 0, x: reduceMotion ? 0 : -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: reduceMotion ? 0 : 0.2 + index * 0.05 }}
            className="grid grid-cols-[7rem_1fr] items-baseline gap-4 border-b border-border py-3.5 text-sm"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="flex items-center gap-2 text-foreground">
              {row.ok ? <Check aria-hidden className="size-3.5 text-primary" strokeWidth={3} /> : null}
              {row.value}
            </dd>
          </motion.div>
        ))}
      </dl>

      <div className="grid gap-3">
        <div>
          <Button asChild size="lg" className="px-4">
            <Link href={APP_HOME_PATH} replace>
              Go to WIT
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">You can change any of this later in Settings.</p>
      </div>
    </div>
  )
}
