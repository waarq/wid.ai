import Link from "next/link"

import { Container, Eyebrow } from "@/components/marketing/layout/section"
import { PageIntro } from "@/components/marketing/layout/page-intro"
import { createMetadata } from "@/components/marketing/seo"

export const metadata = createMetadata({
  title: "WIT Help",
  description: "Where to find answers about capture, privacy, sharing and plans.",
  path: "/help",
})

const topics = [
  {
    title: "How capture works",
    body: "Connect a calendar, choose a meeting and start capture yourself. WIT never records on its own.",
    href: "/how-it-works",
    cta: "How it works",
  },
  {
    title: "Common questions",
    body: "Calendar access, Zoom, privacy, search, exporting notes and what happens if transcription fails.",
    href: "/pricing#faq",
    cta: "Read the FAQ",
  },
  {
    title: "Privacy and sharing",
    body: "What WIT uses, what stays private by default, and how sharing works.",
    href: "/privacy",
    cta: "Privacy",
  },
  {
    title: "Still stuck?",
    body: "Send us a message and describe what you were trying to do.",
    href: "/contact",
    cta: "Contact us",
  },
]

export default function HelpPage() {
  return (
    <>
      <PageIntro
        eyebrow="Resources"
        title="How can we help?"
        description="There is no help center yet. These pages cover the most common questions."
      />
      <section aria-label="Help topics" className="border-t border-border py-14 md:py-20">
        <Container>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {topics.map((topic) => (
              <li key={topic.title} className="border-t border-border py-6">
                <h2 className="text-lg font-semibold tracking-tight">{topic.title}</h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{topic.body}</p>
                <Eyebrow className="mt-4">
                  <Link href={topic.href} className="text-primary-ink underline-offset-4 hover:underline">
                    {topic.cta}
                  </Link>
                </Eyebrow>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
