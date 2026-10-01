import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Container } from "@/components/marketing/layout/section"
import { PageIntro } from "@/components/marketing/layout/page-intro"
import { Cta } from "@/components/marketing/sections/cta"
import { createMetadata } from "@/components/marketing/seo"

export const metadata = createMetadata({
  title: "About WID",
  description: "WID is a meeting intelligence workspace that turns conversations into reliable, traceable work.",
  path: "/about",
})

const principles = [
  {
    title: "The transcript is evidence",
    body: "A transcript is not the product. The useful output is what happened, what was decided, who owns what and what is still open.",
  },
  {
    title: "Everything is traceable",
    body: "Each decision, action and answer points back to the meeting and moment it came from, so you can check it.",
  },
  {
    title: "Capture is manual",
    body: "Your calendar tells WID what exists. You decide what to capture. Nothing is recorded automatically.",
  },
  {
    title: "Private by default",
    body: "Meetings stay private until you share them, and the sharing state is never hidden.",
  },
]

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="A workspace for what meetings leave behind."
        description="WID, short for Wrote It Down, turns conversations into reliable, traceable work. It answers one question well: what actually happened in that meeting, and what do I need to do about it?"
      />
      <section aria-labelledby="principles-title" className="border-t border-border py-16 md:py-24">
        <Container className="grid gap-10 md:grid-cols-12 md:gap-8">
          <h2 id="principles-title" className="text-2xl font-semibold tracking-tight md:col-span-4">
            What we believe
          </h2>
          <ul className="divide-y divide-border border-y border-border md:col-span-8">
            {principles.map((p) => (
              <li key={p.title} className="grid gap-1 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
                <h3 className="text-base font-semibold tracking-tight">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <section aria-labelledby="demo-title" className="border-t border-border py-16 md:py-24">
        <Container className="grid gap-10 md:grid-cols-12 md:gap-8">
          <h2 id="demo-title" className="text-2xl font-semibold tracking-tight md:col-span-4">
            About this demo
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground md:col-span-7 md:col-start-6">
            <p>
              This site and the app behind it are a frontend demonstration. Sign-in, Google Calendar, Zoom,
              capture, transcription and AI answers are simulated, and the people, companies and meetings are
              fictional.
            </p>
            <p>
              The product is built so a real backend can replace the simulated services without changing the
              interface.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="h-10 px-4 text-sm">
                <Link href="/register">Get started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-10 px-4 text-sm">
                <Link href="/contact">Contact</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
      <Cta />
    </>
  )
}
