import Link from "next/link"
import { ArrowRight, ArrowUp, Check, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Container } from "../../layout/section"
import { getBriefData } from "../../data"

const principles = ["Manual capture only", "Private until you share", "Every insight links to its source"]

const drift = "motion-safe:animate-[landing-drift_7s_ease-in-out_infinite_alternate]"

export function LandingHero() {
  const brief = getBriefData()
  return (
    <section aria-labelledby="hero-title" className="landing-stars relative overflow-x-clip">
      <div aria-hidden className="landing-horizon pointer-events-none absolute inset-x-0 top-0 h-[32rem]" />
      <Container className="relative grid items-center gap-16 pt-10 pb-20 md:min-h-[min(calc(100dvh-5rem),50rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10 lg:pt-4 lg:pb-24">
        <div>
          <h1
            id="hero-title"
            className="text-[clamp(2.5rem,1.2rem+4.6vw,5rem)] leading-[1.02] font-light tracking-[-0.035em] text-balance"
          >
            Meetings that <span className="text-primary">remember</span> what happened
          </h1>
          <p className="mt-7 max-w-md text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            WID turns the conversation into notes, decisions and action items.{" "}
            <strong className="font-medium text-foreground">You start every capture.</strong>
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-gradient-to-r from-primary to-[#7fd6d0] px-7 text-sm font-semibold tracking-wide text-[#05130d] uppercase hover:brightness-110"
            >
              <Link href="/register">
                Get started free
                <ArrowRight aria-hidden data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 rounded-full px-5 text-sm">
              <Link href="/how-it-works">See how it works</Link>
            </Button>
          </div>
          <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
            {principles.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check aria-hidden className="size-3.5 text-primary" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <figure aria-label="WID product preview" className="relative grid grid-cols-6 gap-3 sm:gap-4">
          <div className={cn("landing-capsule-glow col-span-4 rounded-[2.5rem] p-6", drift)}>
            <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Capture</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2 text-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" /> Start when you choose
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/60" /> Pause or stop anytime
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/60" /> Never joins a call alone
              </li>
            </ul>
          </div>
          <div className="landing-capsule col-span-2 grid place-items-center rounded-[2.5rem] p-4 text-center">
            <div>
              <Search aria-hidden className="mx-auto size-5 text-primary" />
              <p className="mt-2 text-sm font-medium tracking-tight">Ask WID</p>
            </div>
          </div>

          <div className="landing-capsule relative col-span-2 min-h-32 overflow-hidden rounded-[2.5rem]">
            <div aria-hidden className="landing-orb absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full sm:size-32">
              <div className="landing-orb-bands absolute inset-0" />
            </div>
          </div>
          <div className={cn("landing-capsule-glow col-span-4 rounded-[2.5rem] p-6", drift)} style={{ animationDelay: "-2s" }}>
            <p className="text-sm leading-relaxed text-muted-foreground">
              What follow-ups did I commit to in my meetings this week?
              <span aria-hidden className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-primary motion-safe:animate-pulse" />
            </p>
            <div className="mt-5 flex items-center justify-between">
              <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {brief.title}
              </span>
              <span aria-hidden className="grid size-8 place-items-center rounded-full bg-foreground text-background">
                <ArrowUp className="size-4" />
              </span>
            </div>
          </div>

          <div className="landing-capsule col-span-4 rounded-[2.5rem] p-6">
            <p className="text-sm font-medium tracking-tight">{brief.title}</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {brief.when} · {brief.minutes} min
            </p>
            <div className="mt-4 flex gap-5 border-b border-border text-xs">
              <span className="border-b border-primary pb-2 text-primary">Summary</span>
              <span className="pb-2 text-muted-foreground">Actions</span>
              <span className="pb-2 text-muted-foreground">Transcript</span>
            </div>
            <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{brief.keyPoints[0]}</p>
          </div>
          <div className="landing-capsule relative col-span-2 min-h-32 overflow-hidden rounded-[2.5rem]">
            <div aria-hidden className="landing-orb absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full" />
          </div>
        </figure>
      </Container>
    </section>
  )
}
