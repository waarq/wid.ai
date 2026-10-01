"use client"

import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion"
import { CornerDownLeft } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AskDemoItem } from "../data"
import { Eyebrow } from "../layout/section"

interface AskMeetingDemoProps {
  meetingTitle: string
  items: AskDemoItem[]
}

type Phase = "thinking" | "answered"

/**
 * Ask-the-meeting demo. Answers are pre-written fixtures; the thinking beat is
 * simulated. Jump to a source reveals the quoted line.
 */
export function AskMeetingDemo({ meetingTitle, items }: AskMeetingDemoProps) {
  const reduce = useReducedMotion()
  const [selectedId, setSelectedId] = useState(items[0]?.id)
  const [phase, setPhase] = useState<Phase>("answered")
  const [sourceId, setSourceId] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const selected = items.find((i) => i.id === selectedId) ?? items[0]
  if (!selected) return null

  function ask(id: string) {
    window.clearTimeout(timer.current)
    setSelectedId(id)
    setSourceId(null)
    if (reduce) {
      setPhase("answered")
      return
    }
    setPhase("thinking")
    timer.current = window.setTimeout(() => setPhase("answered"), 700)
  }

  const shownSource = selected.sources.find((s) => s.id === sourceId)

  return (
    <LazyMotion features={domAnimation} strict>
      <figure
        aria-label={`Ask ${meetingTitle}`}
        className="rounded-xl border border-border bg-card p-5 shadow-float sm:p-7"
      >
        <Eyebrow className="mb-3">Ask this meeting</Eyebrow>
        <div className="flex items-start gap-3 rounded-lg border border-input bg-background px-3 py-2.5">
          <p className="min-w-0 flex-1 text-sm leading-snug">&ldquo;{selected.question}&rdquo;</p>
          <CornerDownLeft aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Suggested questions">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === selected.id}
              onClick={() => ask(item.id)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                item.id === selected.id
                  ? "border-primary bg-primary-soft text-primary-ink"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.question}
            </button>
          ))}
        </div>

        <div aria-live="polite" className="mt-6 min-h-60 border-t border-border pt-5">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "thinking" ? (
              <m.p
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-muted-foreground"
              >
                Reading the transcript&hellip;
              </m.p>
            ) : null}
            {phase === "answered" ? (
              <m.div
                key={selected.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
              >
                <Eyebrow className="mb-2">WIT</Eyebrow>
                <p className="text-sm leading-relaxed">{selected.answer}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.sources.map((source) => (
                    <Button
                      key={source.id}
                      type="button"
                      variant={source.id === sourceId ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={source.id === sourceId}
                      onClick={() => setSourceId(source.id === sourceId ? null : source.id)}
                    >
                      Jump to <span className="font-mono">{source.time}</span>
                    </Button>
                  ))}
                </div>
                {shownSource ? (
                  <blockquote className="mt-4 border-l-2 border-primary pl-3 text-sm leading-relaxed">
                    <span className="font-mono text-xs text-muted-foreground">{shownSource.time} </span>
                    <span className="font-medium">{shownSource.speaker}</span>
                    <span className="text-muted-foreground"> {shownSource.quote}</span>
                  </blockquote>
                ) : null}
              </m.div>
            ) : null}
          </AnimatePresence>
        </div>
      </figure>
    </LazyMotion>
  )
}
