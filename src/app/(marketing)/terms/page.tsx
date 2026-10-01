import { termsSections } from "@/components/marketing/content/legal"
import { LegalPage } from "@/components/marketing/layout/legal-page"
import { createMetadata } from "@/components/marketing/seo"

export const metadata = createMetadata({
  title: "WIT Terms",
  description: "Plain-language terms for the WIT product demonstration.",
  path: "/terms",
})

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms" sections={termsSections} />
}
