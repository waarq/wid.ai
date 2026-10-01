import { termsSections } from "@/components/marketing/content/legal"
import { LegalPage } from "@/components/marketing/layout/legal-page"
import { createMetadata } from "@/components/marketing/seo"

export const metadata = createMetadata({
  title: "WID Terms",
  description: "Plain-language terms for the WID product demonstration.",
  path: "/terms",
})

export default function TermsPage() {
  return <LegalPage eyebrow="Legal" title="Terms" sections={termsSections} />
}
