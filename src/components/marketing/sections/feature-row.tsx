import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import type { FeatureCopy } from "../content/features"
import { Eyebrow, Section } from "../layout/section"

interface FeatureRowProps {
  copy: FeatureCopy
  visual: ReactNode
  /** Which side the product visual sits on at md and up. */
  visualSide?: "left" | "right"
  headingAs?: "h2" | "h3"
  space?: "chapter" | "tight"
  rule?: boolean
  extra?: ReactNode
}

/** Text column (sticky on desktop) beside a product visual. Side alternates between features. */
export function FeatureRow({
  copy,
  visual,
  visualSide = "right",
  headingAs: Heading = "h2",
  space = "tight",
  rule = true,
  extra,
}: FeatureRowProps) {
  const left = visualSide === "left"
  return (
    <Section id={copy.id} aria-labelledby={`${copy.id}-title`} space={space} rule={rule} className="scroll-mt-16">
      <div className="grid items-start gap-10 md:grid-cols-12 md:gap-8 lg:gap-12">
        <div className={cn("md:col-span-5", left && "md:order-2 md:col-start-8")}>
          <div className="md:sticky md:top-28">
            <Eyebrow className="mb-4">{copy.eyebrow}</Eyebrow>
            <Heading
              id={`${copy.id}-title`}
              className="text-[clamp(1.5rem,1rem+1.6vw,2.25rem)] leading-[1.1] font-semibold tracking-tight text-balance"
            >
              {copy.title}
            </Heading>
            <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">{copy.description}</p>
            {copy.points ? (
              <ul className="mt-6 divide-y divide-border border-y border-border text-sm">
                {copy.points.map((point) => (
                  <li key={point} className="py-2.5">
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
            {extra}
          </div>
        </div>
        <div className={cn("min-w-0 md:col-span-7", left ? "md:order-1" : "md:col-start-6 lg:col-start-6")}>
          {visual}
        </div>
      </div>
    </Section>
  )
}
