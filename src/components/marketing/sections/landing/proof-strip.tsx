import { builtFor } from "../../content/home"
import { Container, Eyebrow } from "../../layout/section"

/** Conceptual proof only: roles, not customer logos. Marquee pauses for reduced motion via the global rule. */
export function ProofStrip() {
  const roles = [...builtFor, ...builtFor]
  return (
    <section id="built-for" aria-label="Built for" className="scroll-mt-20 pb-20">
      <Container>
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr] md:gap-10">
          <Eyebrow>Built for teams in</Eyebrow>
          <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
            <ul className="flex w-max gap-3 motion-safe:animate-[landing-marquee_32s_linear_infinite]">
              {roles.map((item, i) => (
                <li
                  key={`${item.role}-${i}`}
                  aria-hidden={i >= builtFor.length}
                  className="landing-capsule rounded-2xl px-8 py-4 text-sm font-medium tracking-tight whitespace-nowrap"
                >
                  {item.role}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}
