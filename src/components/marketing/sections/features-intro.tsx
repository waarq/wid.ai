import { Container, SectionHeading } from "../layout/section"

export function FeaturesIntro() {
  return (
    <section aria-labelledby="features-title" className="border-t border-border pt-24 md:pt-32">
      <Container>
        <SectionHeading
          id="features-title"
          eyebrow="What you get"
          title="After every meeting, the part that matters."
          description="A brief first, evidence underneath, and a clear next step for each person."
        />
      </Container>
    </section>
  )
}
