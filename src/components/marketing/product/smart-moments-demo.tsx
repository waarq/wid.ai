"use client"

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion"
import { useState } from "react"

import { cn } from "@/lib/utils"
import type { KeyMomentType } from "@/types"
import type { MomentDemo } from "../data"
import { momentMeta } from "./moment-meta"

interface SmartMomentsDemoProps {
  meetingTitle: string
  durationLabel: string
  moments: MomentDemo[]
}

const legend: KeyMomentType[] = ["decision", "commitment", "risk", "question", "insight"]

/** Timeline of key moments. Selecting one shows the transcript around its timestamp. */
export function SmartMomentsDemo({ meetingTitle, durationLabel, moments }: SmartMomentsDemoProps) {
  const [activeId, setActiveId] = useState(moments[0]?.id)
  const reduce = useReducedMotion()
  const active = moments.find((x) => x.id === activeId) ?? moments[0]
  if (!active) return null
  const ActiveIcon = momentMeta[active.type].icon

  return (
    <LazyMotion features={domAnimation} strict>
      <figure
        aria-label={`Smart moments in ${meetingTitle}`}
        className="rounded-xl border border-border bg-card p-5 shadow-float sm:p-7"
      >
        <ul aria-label="Moment types" className="mb-6 flex flex-wrap gap-x-5 gap-y-1.5">
          {legend.map((type) => {
            const { icon: Icon, label, tone } = momentMeta[type]
            return (
              <li key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon aria-hidden className={cn("size-3.5", tone)} />
                {label}
              </li>
            )
          })}
        </ul>

        <div role="group" aria-label="Moments on the meeting timeline" className="relative mx-3.5 h-9">
          <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
          {moments.map((moment) => {
            const { icon: Icon, label, tone } = momentMeta[moment.type]
            const selected = moment.id === active.id
            return (
              <button
                key={moment.id}
                type="button"
                aria-pressed={selected}
                aria-label={`${label} at ${moment.label}: ${moment.title}`}
                onClick={() => setActiveId(moment.id)}
                style={{ left: `${moment.position}%` }}
                className={cn(
                  "absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-background transition-[transform,border-color,background-color] duration-150 outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                  selected ? "border-primary bg-primary-soft" : "border-border-strong",
                )}
              >
                <Icon aria-hidden className={cn("size-4", tone)} />
              </button>
            )
          })}
        </div>
        <div aria-hidden className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>00:00</span>
          <span>{durationLabel}</span>
        </div>

        <div aria-live="polite" className="mt-6 min-h-64 border-t border-border pt-5">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={active.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <div className="flex items-start gap-3">
                <ActiveIcon aria-hidden className={cn("mt-0.5 size-5 shrink-0", momentMeta[active.type].tone)} />
                <div>
                  <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                    {momentMeta[active.type].label} · {active.label}
                  </p>
                  <p className="mt-1 text-base font-medium tracking-tight">{active.title}</p>
                </div>
              </div>
              <ol className="mt-5 space-y-3">
                {active.lines.map((line) => (
                  <li
                    key={line.id}
                    className={cn(
                      "grid grid-cols-[3rem_1fr] gap-x-2 border-l-2 py-0.5 pl-3 text-sm leading-snug",
                      line.id === active.focusId ? "border-primary" : "border-transparent text-muted-foreground",
                    )}
                  >
                    <span className="font-mono text-xs text-muted-foreground">{line.time}</span>
                    <span>
                      <span className="font-medium text-foreground">{line.speaker}</span> {line.text}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                Source: {meetingTitle} <span className="font-mono">{active.label}</span>
              </p>
            </m.div>
          </AnimatePresence>
        </div>
      </figure>
    </LazyMotion>
  )
}
