import Link from "next/link"

import { createMetadata } from "@/components/marketing/seo"
import { BuiltFor } from "@/components/marketing/sections/built-for"
import { Cta } from "@/components/marketing/sections/cta"
import { Faq } from "@/components/marketing/sections/faq"
import {
  ActionItemsFeature,
  AskMeetingFeature,
  MeetingBriefFeature,
} from "@/components/marketing/sections/feature-showcases"
import { FeaturesIntro } from "@/components/marketing/sections/features-intro"
import { Hero } from "@/components/marketing/sections/hero"
import { HowItWorks } from "@/components/marketing/sections/how-it-works"
import { PrivacyBlock } from "@/components/marketing/sections/privacy-block"
import { Problem } from "@/components/marketing/sections/problem"
import { faqItems } from "@/components/marketing/content/faq"

export const metadata = createMetadata({
  title: "WIT — AI Meeting Intelligence",
  description: "WIT turns meetings into clear notes, decisions, action items and searchable knowledge.",
  path: "/",
})

export default function HomePage() {
  return (
    <>
      <Hero />
      <BuiltFor />
      <Problem />
      <HowItWorks variant="summary" />
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
      <Cta />
    </>
  )
}
