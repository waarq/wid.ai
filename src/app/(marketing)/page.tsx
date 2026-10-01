import Link from "next/link"

import { createMetadata } from "@/components/marketing/seo"
import { LandingTheme } from "@/components/marketing/landing-theme"
import { AskMeetingDemo } from "@/components/marketing/product/ask-meeting-demo"
import { ActionsPanel } from "@/components/marketing/product/actions-panel"
import { BriefCard } from "@/components/marketing/product/brief-card"
import { Container, Section, SectionHeading } from "@/components/marketing/layout/section"
import { Faq } from "@/components/marketing/sections/faq"
import {
  ActionItemsFeature,
  AskMeetingFeature,
  MeetingBriefFeature,
} from "@/components/marketing/sections/feature-showcases"
import { FeaturesIntro } from "@/components/marketing/sections/features-intro"
import { HowItWorks } from "@/components/marketing/sections/how-it-works"
import { Audience } from "@/components/marketing/sections/landing/audience"
import { LandingCta } from "@/components/marketing/sections/landing/landing-cta"
import { LandingHero } from "@/components/marketing/sections/landing/landing-hero"
import { ProofStrip } from "@/components/marketing/sections/landing/proof-strip"
import { Spotlight, type SpotlightItem } from "@/components/marketing/sections/landing/spotlight"
import { PrivacyBlock } from "@/components/marketing/sections/privacy-block"
import { Problem } from "@/components/marketing/sections/problem"
import { getAskDemoData } from "@/components/marketing/data"
import { faqItems } from "@/components/marketing/content/faq"

export const metadata = createMetadata({
  title: "WIT — AI Meeting Intelligence",
  description: "WIT turns meetings into clear notes, decisions, action items and searchable knowledge.",
  path: "/",
})

export default function HomePage() {
  const ask = getAskDemoData()
  const spotlight: SpotlightItem[] = [
    {
      id: "clarity",
      word: "Clarity",
      tag: "Unforgettable meetings, quite literally",
      body: "A brief first: what was decided, what happens next and what is still open. The transcript stays underneath as evidence.",
      panel: <BriefCard />,
    },
    {
      id: "momentum",
      word: "Momentum",
      tag: "Every action knows where it came from",
      body: "Actions are owned, dated and linked to the exact moment they were agreed, so nothing disappears into chat.",
      panel: <ActionsPanel />,
    },
    {
      id: "ease",
      word: "Ease",
      tag: "Ask instead of searching",
      body: "Ask a meeting a question and get the answer with the timestamps it used. Check it instead of trusting it.",
      panel: <AskMeetingDemo meetingTitle={ask.meetingTitle} items={ask.items} />,
    },
  ]

  return (
    <div className="dark bg-background text-foreground">
      <LandingTheme />
      <LandingHero />
      <ProofStrip />

      <section id="spotlight" aria-label="What WIT gives you" className="relative scroll-mt-4 border-t border-border py-24 md:py-32">
        <Container>
          <Spotlight items={spotlight} />
        </Container>
      </section>

      <Problem />
      <HowItWorks variant="summary" />

      <Section id="audience" aria-labelledby="audience-title" className="landing-stars">
        <SectionHeading
          id="audience-title"
          className="mx-auto mb-14 max-w-3xl text-center [&_h2]:font-light [&_h2]:tracking-[-0.03em]"
          title="Whether it’s just you or the whole team, WIT has your back."
        />
        <Audience />
      </Section>

      <FeaturesIntro />
      <MeetingBriefFeature headingAs="h3" space="tight" />
      <ActionItemsFeature headingAs="h3" space="tight" />
      <AskMeetingFeature headingAs="h3" space="tight" />
      <div className="border-t border-border" />
      <PrivacyBlock />
      <Faq
        items={faqItems.slice(0, 6)}
        footer={
          <p className="mt-6 text-sm text-muted-foreground">
            More answers on the{" "}
            <Link href="/pricing#faq" className="font-medium text-foreground underline underline-offset-4">
              pricing page
            </Link>
            .
          </p>
        }
      />
      <LandingCta />
    </div>
  )
}
