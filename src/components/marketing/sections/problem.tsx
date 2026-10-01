import { ArrowDown, ArrowRight } from "lucide-react"

import { outputs, problems } from "../content/home"
import { Eyebrow, Section, SectionHeading } from "../layout/section"

export function Problem() {
  return (
    <Section aria-labelledby="problem-title">
      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <div className="md:sticky md:top-28">
            <SectionHeading
              id="problem-title"
              eyebrow="The problem"
              title="The meeting ends. The work doesn&rsquo;t."
              description="Most of what matters in a meeting is spoken once and never written down in a form anyone can use."
            />
          </div>
        </div>
        <ol className="md:col-span-7 md:col-start-6">
          {problems.map((problem, index) => (
            <li
              key={problem}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-3 border-t border-border py-4 last:border-b"
            >
              <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <span className="text-base leading-snug md:text-lg">{problem}</span>
            </li>
          ))}
        </ol>
      </div>

      <figure
        aria-label="How WIT turns a conversation into decisions, actions, questions, context and follow-ups"
        className="mt-20 grid items-stretch gap-6 border-y border-border py-8 md:mt-28 md:grid-cols-[1fr_auto_1fr_auto_1.2fr] md:gap-8"
      >
        <div>
          <Eyebrow className="mb-3">Input</Eyebrow>
          <p className="text-xl font-semibold tracking-tight">Conversation</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Forty minutes of people talking, with the important parts buried inside.
          </p>
        </div>
        <FlowArrow />
        <div>
          <Eyebrow className="mb-3">Process</Eyebrow>
          <p className="text-xl font-semibold tracking-tight">WIT understands it</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            It reads the transcript, separates what was decided from what was discussed, and keeps the source of each point.
          </p>
        </div>
        <FlowArrow />
        <div>
          <Eyebrow className="mb-3">Output</Eyebrow>
          <ul className="divide-y divide-border border-y border-border">
            {outputs.map(({ label, detail, icon: Icon }) => (
              <li key={label} className="flex items-center gap-3 py-2.5">
                <Icon aria-hidden className="size-4 shrink-0 text-primary" />
                <span className="text-sm font-medium">{label}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </figure>
    </Section>
  )
}

function FlowArrow() {
  return (
    <div aria-hidden className="grid place-items-center text-muted-foreground">
      <ArrowDown className="size-4 md:hidden" />
      <ArrowRight className="hidden size-4 md:block" />
    </div>
  )
}
