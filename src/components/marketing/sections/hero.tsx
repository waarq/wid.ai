import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Container, Eyebrow } from "../layout/section"
import { ProductPreview } from "../product/product-preview"
import { HeroMotion } from "./hero-motion"

const principles = [
  "Manual capture only",
  "Private until you share",
  "Every insight links to its source",
]

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-x-clip">
      <Container className="grid items-center gap-14 pt-10 pb-20 md:min-h-[calc(100dvh-4rem)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-10 md:pt-8 md:pb-24 lg:gap-16">
        <div>
          <Eyebrow className="mb-6 flex items-center gap-2">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            AI meeting intelligence
          </Eyebrow>
          <h1
            id="hero-title"
            className="text-[clamp(1.875rem,1rem+2.4vw,3rem)] leading-[1.06] font-semibold tracking-tight"
          >
            Meetings are where work happens. WIT remembers what happened.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            WIT captures your meetings, understands the conversation, and turns it into clear notes,
            decisions, action items and searchable knowledge.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="h-10 px-4 text-sm">
              <Link href="/register">
                Get started
                <ArrowRight aria-hidden data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10 px-4 text-sm">
              <Link href="/how-it-works">See how it works</Link>
            </Button>
          </div>
          <ul className="mt-12 grid max-w-lg gap-x-6 gap-y-2 border-t border-border pt-5 text-[13px] text-muted-foreground sm:grid-cols-3">
            {principles.map((p) => (
              <li key={p} className="leading-snug">
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:pb-52 lg:pl-6">
          <HeroMotion>
            <ProductPreview />
          </HeroMotion>
        </div>
      </Container>
    </section>
  )
}
