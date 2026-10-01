import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Section } from "../layout/section"

export function Cta() {
  return (
    <Section aria-labelledby="cta-title">
      <div className="grid items-end gap-10 md:grid-cols-12">
        <div className="md:col-span-8">
          <h2
            id="cta-title"
            className="text-[clamp(2rem,1.2rem+3vw,3.5rem)] leading-[1.04] font-semibold tracking-tight text-balance"
          >
            Your meetings, understood.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            Connect your calendar, capture when you choose, and get decisions and action items you can trace to the
            conversation.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:col-span-4 md:justify-end">
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
      </div>
    </Section>
  )
}
