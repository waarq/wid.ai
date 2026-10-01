import { createMetadata } from "@/components/marketing/seo"
import { PageIntro } from "@/components/marketing/layout/page-intro"
import { BuiltFor } from "@/components/marketing/sections/built-for"
import { Cta } from "@/components/marketing/sections/cta"
import { FeatureShowcases } from "@/components/marketing/sections/feature-showcases"
import { PrivacyBlock } from "@/components/marketing/sections/privacy-block"

export const metadata = createMetadata({
  title: "WID Features",
  description:
    "Meeting briefs, source-linked action items, smart moments, questions about a meeting, searchable memory, decision history and follow-ups.",
  path: "/features",
})

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Product"
        title="Everything a meeting should leave behind."
        description="WID turns a conversation into a brief you can read in a minute, with every point traceable to the moment it was said."
      />
      <FeatureShowcases />
      <BuiltFor />
      <PrivacyBlock />
      <Cta />
    </>
  )
}
