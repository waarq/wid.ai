import { createMetadata } from "@/components/marketing/seo"
import { PageIntro } from "@/components/marketing/layout/page-intro"
import { Cta } from "@/components/marketing/sections/cta"
import { Faq } from "@/components/marketing/sections/faq"
import { PricingPlans } from "@/components/marketing/sections/pricing-plans"

export const metadata = createMetadata({
  title: "WID Pricing",
  description: "Plans for individuals, growing teams and organizations. Pricing is shown for product demonstration.",
  path: "/pricing",
})

export default function PricingPage() {
  return (
    <>
      <PageIntro
        eyebrow="Pricing"
        title="Start free. Add your team when you are ready."
        description="Four plans, from trying WID to rolling it out across an organization."
      />
      <PricingPlans />
      <Faq headingAs="h2" structuredData />
      <Cta />
    </>
  )
}
