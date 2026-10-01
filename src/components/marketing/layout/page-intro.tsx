import type { ReactNode } from "react"

import { Container, Eyebrow } from "./section"

interface PageIntroProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
}

/** Top of every secondary marketing page. Owns the page's single h1. */
export function PageIntro({ eyebrow, title, description, children }: PageIntroProps) {
  return (
    <section aria-labelledby="page-title" className="pt-14 pb-16 md:pt-24 md:pb-20">
      <Container>
        <Eyebrow className="mb-5">{eyebrow}</Eyebrow>
        <h1
          id="page-title"
          className="max-w-3xl text-[clamp(2rem,1.1rem+3vw,3.5rem)] leading-[1.05] font-semibold tracking-tight text-balance"
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-6 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </Container>
    </section>
  )
}
