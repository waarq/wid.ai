import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { PageIntro } from "./page-intro"
import { Container, Eyebrow } from "./section"

interface ComingSoonProps {
  eyebrow: string
  title: string
  description: string
  heading: string
  items: string[]
  actions?: ReactNode
}

/** Honest placeholder for resources that do not exist yet. Always offers a way forward. */
export function ComingSoon({ eyebrow, title, description, heading, items, actions }: ComingSoonProps) {
  return (
    <>
      <PageIntro eyebrow={eyebrow} title={title} description={description} />
      <section aria-labelledby="coming-soon-title" className="border-t border-border py-14 md:py-20">
        <Container className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <Eyebrow className="mb-3">Status</Eyebrow>
            <h2 id="coming-soon-title" className="text-xl font-semibold tracking-tight">
              {heading}
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {actions ?? (
                <>
                  <Button asChild size="lg" className="h-10 px-4 text-sm">
                    <Link href="/how-it-works">See how it works</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-10 px-4 text-sm">
                    <Link href="/contact">Contact us</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <ul className="divide-y divide-border border-y border-border md:col-span-6 md:col-start-7">
            {items.map((item) => (
              <li key={item} className="py-3 text-sm">
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
