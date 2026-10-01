"use client"

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface SpotlightItem {
  id: string
  word: string
  tag: string
  body: string
  panel: ReactNode
}

/** Clarity / Momentum / Ease: a big stacked word list beside a circular product window. */
export function Spotlight({ items }: { items: SpotlightItem[] }) {
  const reduce = useReducedMotion()
  const [activeId, setActiveId] = useState(items[0].id)
  const active = items.find((i) => i.id === activeId) ?? items[0]

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div role="tablist" aria-label="What WID gives you" className="flex flex-col gap-2">
          {items.map((item) => {
            const on = item.id === activeId
            return (
              <div key={item.id}>
                <button
                  type="button"
                  role="tab"
                  id={`spot-tab-${item.id}`}
                  aria-selected={on}
                  aria-controls="spot-panel"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "block rounded-md text-left text-[clamp(2.25rem,1.4rem+3vw,4rem)] leading-[1.15] font-light tracking-[-0.03em] transition-colors duration-200",
                    on ? "text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground",
                  )}
                >
                  {item.word}
                </button>
                {on ? (
                  <div className="mt-3 max-w-md pb-4">
                    <p className="text-sm text-primary">+ {item.tag}</p>
                    <p className="mt-4 text-base leading-relaxed text-foreground/90">{item.body}</p>
                    <Button
                      asChild
                      size="lg"
                      className="mt-6 h-11 rounded-full bg-gradient-to-r from-primary to-[#7fd6d0] px-6 text-sm font-semibold text-[#05130d] hover:brightness-110"
                    >
                      <Link href="/register">Get started, it’s free</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        <div
          role="tabpanel"
          id="spot-panel"
          aria-labelledby={`spot-tab-${active.id}`}
          className="relative mx-auto aspect-square w-full max-w-[40rem]"
        >
          <div aria-hidden className="absolute inset-0 rounded-full bg-[#f4f1ea] p-2.5">
            <div className="landing-rings size-full rounded-full" />
          </div>
          <div className="absolute inset-[10%] overflow-hidden rounded-[2rem] border border-border bg-card/95 shadow-float sm:inset-x-[12%]">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={active.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full overflow-hidden [&_figure]:rounded-none [&_figure]:border-0 [&_figure]:bg-transparent [&_figure]:shadow-none"
              >
                {active.panel}
              </m.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </LazyMotion>
  )
}
