import { ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"

import { steps } from "../content/home"
import { Section, SectionHeading } from "../layout/section"
import { CalendarVisual, CaptureVisual, ProcessingVisual } from "../product/how-visuals"
import { SearchMemory } from "../product/search-memory"

const visuals: Record<string, ReactNode> = {
  "01": <CalendarVisual />,
  "02": <CaptureVisual />,
  "03": <ProcessingVisual />,
  "04": <SearchMemory compact />,
}

interface HowItWorksProps {
  /** "summary" omits the product visuals (home page). */
  variant?: "summary" | "full"
  headingAs?: "h1" | "h2"
}

export function HowItWorks({ variant = "full", headingAs = "h2" }: HowItWorksProps) {
  const full = variant === "full"
  return (
    <Section id="how-it-works" aria-labelledby="how-title" space={full ? "tight" : "chapter"} rule={!full}>
      <SectionHeading
        as={headingAs}
        id="how-title"
        eyebrow="How it works"
        title="Four steps, and you stay in control of each one."
      />
      <ol className="mt-14 md:mt-20">
        {steps.map((step) => (
          <li
            key={step.number}
            className="grid gap-6 border-t border-border py-10 md:grid-cols-12 md:gap-8 md:py-14"
          >
            <p
              aria-hidden
              className="num text-6xl leading-none font-light tracking-tight text-muted-foreground/70 md:col-span-2 md:text-7xl"
            >
              {step.number}
            </p>
            <div className={full ? "md:col-span-5" : "md:col-span-10 md:max-w-xl"}>
              <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                <span className="sr-only">Step {step.number}: </span>
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{step.body}</p>
              {step.list ? (
                <ul className="mt-4 grid max-w-sm grid-cols-2 gap-x-6 text-sm">
                  {step.list.map((item) => (
                    <li key={item} className="border-t border-border py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
              {step.note ? (
                <p className="mt-5 flex items-start gap-2.5 border-l-2 border-primary pl-3 text-sm font-medium">
                  <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  {step.note}
                </p>
              ) : null}
            </div>
            {full ? <div className="md:col-span-5">{visuals[step.number]}</div> : null}
          </li>
        ))}
      </ol>
    </Section>
  )
}
