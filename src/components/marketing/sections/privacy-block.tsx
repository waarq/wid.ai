import { Check } from "lucide-react"

import { Section, SectionHeading } from "../layout/section"

const permissions = [
  "View your calendar events",
  "Read meeting titles",
  "Read meeting times",
  "Read attendee information",
]

const commitments = [
  {
    title: "You decide when to capture.",
    body: "WID won’t automatically record your calendar meetings. Your calendar tells WID what is coming up, and nothing more.",
  },
  {
    title: "Private until you share.",
    body: "Your meeting is private unless you choose to share it. The sharing state is always visible: Private, Shared with attendees, or Shared with team.",
  },
  {
    title: "Evidence, not guesses.",
    body: "Every decision, action and answer links back to the meeting and timestamp it came from, so you can verify it.",
  },
]

export function PrivacyBlock() {
  return (
    <Section aria-labelledby="privacy-title">
      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <SectionHeading
            id="privacy-title"
            eyebrow="Privacy-first"
            title="Capture is yours to start."
            description="WID is built around consent and control. These are product rules, not settings you have to find."
          />
        </div>
        <div className="md:col-span-7">
          <ul className="divide-y divide-border border-y border-border">
            {commitments.map((item) => (
              <li key={item.title} className="grid gap-1 py-6 sm:grid-cols-[14rem_1fr] sm:gap-8">
                <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <p className="mb-3 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              What WID needs access to
            </p>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {permissions.map((p) => (
                <li key={p} className="flex items-center gap-2.5 border-t border-border py-2.5 text-sm">
                  <Check aria-hidden className="size-4 shrink-0 text-primary" />
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              WID does not automatically record your calendar meetings.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}
