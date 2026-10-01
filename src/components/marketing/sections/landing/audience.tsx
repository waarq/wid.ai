"use client"

import Link from "next/link"
import { Gavel, ListChecks, Search, Share2, type LucideIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Tab {
  id: string
  label: string
  title: string
  body: string[]
  points: { icon: LucideIcon; text: string }[]
}

const tabs: Tab[] = [
  {
    id: "teams",
    label: "WID for teams",
    title: "Shared visibility. Smarter execution.",
    body: [
      "Share the meetings that matter with attendees or your whole team, so decisions are visible and follow-through is consistent.",
      "Search conversations and keep work moving without the manual write-up.",
    ],
    points: [
      { icon: Share2, text: "Share a meeting with attendees or the team. The sharing state is always visible." },
      { icon: ListChecks, text: "Turn conversations into owned, dated next steps." },
      { icon: Gavel, text: "Keep decisions and commitments findable across meetings." },
      { icon: Search, text: "Search everything that was said, then jump to the moment." },
    ],
  },
  {
    id: "individuals",
    label: "WID for individuals",
    title: "A memory for your own meetings.",
    body: [
      "Everything stays private until you decide to share it. Capture a meeting, read the brief, and move on.",
      "Ask a question later and get the exact moment, not a guess.",
    ],
    points: [
      { icon: ListChecks, text: "See only the actions that are yours, with where they came from." },
      { icon: Search, text: "Ask a meeting a question and check the timestamps it used." },
      { icon: Gavel, text: "Recall what was decided without rereading a transcript." },
      { icon: Share2, text: "Share only when you choose to." },
    ],
  },
]

export function Audience() {
  const [activeId, setActiveId] = useState(tabs[0].id)
  const tab = tabs.find((t) => t.id === activeId) ?? tabs[0]

  return (
    <div className="landing-capsule relative rounded-[2.5rem] px-6 pt-8 pb-10 sm:px-12 lg:px-16">
      <div role="tablist" aria-label="Audience" className="grid grid-cols-2 border-b border-border">
        {tabs.map((t) => {
          const on = t.id === activeId
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`aud-tab-${t.id}`}
              aria-selected={on}
              aria-controls="aud-panel"
              onClick={() => setActiveId(t.id)}
              className={cn(
                "-mb-px border-b px-2 pb-4 text-base font-light tracking-tight transition-colors sm:text-2xl",
                on ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id="aud-panel"
        aria-labelledby={`aud-tab-${tab.id}`}
        className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14"
      >
        <div>
          <h3 className="text-[clamp(1.75rem,1.1rem+2.2vw,3rem)] leading-[1.1] font-light tracking-[-0.03em] text-balance">
            {tab.title}
          </h3>
          <div className="mt-7 space-y-4 text-base leading-relaxed text-muted-foreground">
            {tab.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <Button asChild size="lg" className="mt-8 h-11 rounded-full px-6 text-sm font-semibold">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
        <ul className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {tab.points.map(({ icon: Icon, text }) => (
            <li key={text}>
              <Icon aria-hidden className="size-7 text-primary" strokeWidth={1.5} />
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
