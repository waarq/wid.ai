import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Container } from "../../layout/section"

export function LandingCta() {
  return (
    <section aria-labelledby="cta-title" className="landing-stars relative overflow-hidden border-t border-border">
      <div aria-hidden className="landing-orb absolute -bottom-[30rem] left-1/2 size-[44rem] -translate-x-1/2 rounded-full opacity-90" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-transparent" />
      <Container className="relative py-28 text-center md:py-40">
        <h2
          id="cta-title"
          className="mx-auto max-w-3xl text-[clamp(2.25rem,1.2rem+4vw,4.5rem)] leading-[1.04] font-light tracking-[-0.035em] text-balance"
        >
          Your meetings, understood.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
          Connect your calendar, capture when you choose, and get decisions you can trace to the conversation.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full bg-gradient-to-r from-primary to-[#7fd6d0] px-8 text-sm font-semibold tracking-wide text-[#05130d] uppercase hover:brightness-110"
          >
            <Link href="/register">
              Get started free
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 rounded-full px-6 text-sm">
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </div>
        <div className="h-48 md:h-72" />
      </Container>
    </section>
  )
}
