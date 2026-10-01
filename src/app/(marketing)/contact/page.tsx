import { Mail, ShieldCheck } from "lucide-react"
import dynamic from "next/dynamic"

import { ContactFormSkeleton } from "@/components/marketing/contact/contact-form-skeleton"
import { Container } from "@/components/marketing/layout/section"
import { PageIntro } from "@/components/marketing/layout/page-intro"
import { createMetadata } from "@/components/marketing/seo"

const ContactForm = dynamic(
  () => import("@/components/marketing/contact/contact-form").then((mod) => mod.ContactForm),
  { loading: () => <ContactFormSkeleton /> },
)

export const metadata = createMetadata({
  title: "Contact WID",
  description: "Questions about WID, plans or this demo? Send us a message.",
  path: "/contact",
})

export default function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Tell us what you are trying to solve."
        description="Questions about plans, the demo, or how WID would fit your meetings."
      />
      <section aria-label="Contact form" className="border-t border-border py-16 md:py-24">
        <Container className="grid gap-12 md:grid-cols-12 md:gap-8">
          <aside className="md:col-span-4">
            <ul className="space-y-6 text-sm">
              <li className="flex gap-3">
                <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="leading-relaxed text-muted-foreground">
                  Messages from this form are not delivered anywhere yet. It demonstrates validation and the
                  sent, sending and error states.
                </p>
              </li>
              <li className="flex gap-3">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="leading-relaxed text-muted-foreground">
                  Please do not include confidential meeting content in a message.
                </p>
              </li>
            </ul>
          </aside>
          <div className="md:col-span-7 md:col-start-6">
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  )
}
