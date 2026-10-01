import type { ComponentProps, ElementType, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-5 sm:px-8", className)} {...props} />
}

interface SectionProps extends Omit<ComponentProps<"section">, "title"> {
  /** Draws the hairline rule that separates chapters. */
  rule?: boolean
  /** Vertical rhythm. "tight" is used for stacked showcases on the features page. */
  space?: "chapter" | "tight"
}

/** One chapter of a page: hairline above, generous vertical rhythm. */
export function Section({ rule = true, space = "chapter", className, children, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        rule && "border-t border-border",
        space === "chapter" ? "py-24 md:py-32" : "py-16 md:py-24",
        className,
      )}
      {...props}
    >
      <Container>{children}</Container>
    </section>
  )
}

/** Small mono label used for metadata, section names and timestamps. */
export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  )
}

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  as?: "h1" | "h2"
  id?: string
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  as: Tag = "h2",
  id,
  className,
}: SectionHeadingProps) {
  const Heading: ElementType = Tag
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
      <Heading
        id={id}
        className="text-[clamp(1.75rem,1.1rem+2vw,2.75rem)] leading-[1.08] font-semibold tracking-tight text-balance"
      >
        {title}
      </Heading>
      {description ? (
        <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  )
}
