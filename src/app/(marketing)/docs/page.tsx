import { ComingSoon } from "@/components/marketing/layout/coming-soon"
import { createMetadata } from "@/components/marketing/seo"

export const metadata = createMetadata({
  title: "WID Documentation",
  description: "Documentation for WID is on its way. Here is what it will cover.",
  path: "/docs",
})

export default function DocsPage() {
  return (
    <ComingSoon
      eyebrow="Resources"
      title="Documentation is coming."
      description="There is no documentation yet. The product overview is on the How it works page in the meantime."
      heading="What it will cover"
      items={[
        "Connecting Google Calendar and Zoom",
        "How manual capture works",
        "Reading a meeting brief and its sources",
        "Sharing and privacy controls",
        "Connecting WID to a backend API",
      ]}
    />
  )
}
