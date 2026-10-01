import { privacySections } from "@/components/marketing/content/legal"
import { LegalPage } from "@/components/marketing/layout/legal-page"
import { createMetadata } from "@/components/marketing/seo"

export const metadata = createMetadata({
  title: "WID Privacy",
  description: "How WID is designed to treat your information, and what this demo does and does not collect.",
  path: "/privacy",
})

export default function PrivacyPage() {
  return <LegalPage eyebrow="Legal" title="Privacy" sections={privacySections} />
}
