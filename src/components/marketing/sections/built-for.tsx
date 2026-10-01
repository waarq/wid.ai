import { builtFor } from "../content/home"
import { Eyebrow, Section } from "../layout/section"

export function BuiltFor() {
  return (
    <Section id="built-for" aria-labelledby="built-for-title" className="scroll-mt-16 py-16 md:py-24">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-3">
          <Eyebrow id="built-for-title" className="md:sticky md:top-24">
            Built for
          </Eyebrow>
        </div>
        <ul className="grid gap-x-10 sm:grid-cols-2 md:col-span-9 lg:grid-cols-3">
          {builtFor.map((item) => (
            <li key={item.role} className="border-t border-border py-5">
              <h3 className="text-base font-semibold tracking-tight">{item.role}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.line}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
