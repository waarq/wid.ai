import type { ReactNode } from "react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { faqItems, type FaqItem } from "../content/faq"
import { Section, SectionHeading } from "../layout/section"

interface FaqProps {
  items?: FaqItem[]
  headingAs?: "h1" | "h2"
  /** Emit FAQPage structured data. Enable on one page only. */
  structuredData?: boolean
  footer?: ReactNode
}

export function Faq({ items = faqItems, headingAs = "h2", structuredData = false, footer }: FaqProps) {
  const jsonLd = structuredData
    ? JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }).replace(/</g, "\\u003c")
    : null

  return (
    <Section id="faq" aria-labelledby="faq-title" className="scroll-mt-16">
      <div className="grid gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-4">
          <SectionHeading
            as={headingAs}
            id="faq-title"
            eyebrow="Questions"
            title="Straight answers."
            description="What WID does, what it does not do, and what is simulated in this demo."
          />
        </div>
        <div className="md:col-span-8">
          <Accordion type="single" collapsible className="border-t border-border">
            {items.map((item) => (
              <AccordionItem key={item.id} value={item.id} className="border-b border-border">
                <AccordionTrigger className="rounded-none py-5 text-base font-medium hover:no-underline focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="max-w-2xl pb-5 text-base leading-relaxed text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {footer}
        </div>
      </div>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /> : null}
    </Section>
  )
}
