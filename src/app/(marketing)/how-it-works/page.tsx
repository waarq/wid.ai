import { createMetadata } from "@/components/marketing/seo"
import { PageIntro } from "@/components/marketing/layout/page-intro"
import { Cta } from "@/components/marketing/sections/cta"
import { HowItWorks } from "@/components/marketing/sections/how-it-works"
import { PrivacyBlock } from "@/components/marketing/sections/privacy-block"

export const metadata = createMetadata({
  title: "How WID Works",
  description:
    "Connect your calendar, capture when you choose, and let WID turn the conversation into decisions, action items and searchable knowledge.",
  path: "/how-it-works",
})

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
        eyebrow="How it works"
        title="From a calendar invite to a clear next step."
        description="WID knows what is on your calendar. It records nothing until you tell it to."
      />
      <HowItWorks variant="full" headingAs="h2" />
      <PrivacyBlock />
      <Cta />
    </>
  )
}
