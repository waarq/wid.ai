import { LEGAL_UPDATED, type LegalSection } from "../content/legal"
import { PageIntro } from "./page-intro"
import { Container } from "./section"

interface LegalPageProps {
  eyebrow: string
  title: string
  sections: LegalSection[]
}

export function LegalPage({ eyebrow, title, sections }: LegalPageProps) {
  return (
    <>
      <PageIntro eyebrow={eyebrow} title={title}>
        <p className="font-mono text-xs text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
      </PageIntro>
      <section aria-label={title} className="border-t border-border py-14 md:py-20">
        <Container>
          <div className="max-w-2xl divide-y divide-border">
            {sections.map((section) => (
              <article key={section.title} className="grid gap-3 py-8 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-8">
                <h2 className="text-base font-semibold tracking-tight">{section.title}</h2>
                <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}
