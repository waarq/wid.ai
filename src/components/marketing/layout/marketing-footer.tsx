import Link from "next/link"

import { Logo } from "@/components/shared/logo"
import { footerColumns } from "../content/navigation"
import { Container, Eyebrow } from "./section"

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo size="lg" />
            <p className="mt-3 text-sm text-muted-foreground">AI meeting intelligence.</p>
          </div>
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 md:col-span-8"
          >
            {footerColumns.map((column) => (
              <div key={column.title}>
                <Eyebrow className="mb-4">{column.title}</Eyebrow>
                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-16 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono">&copy; 2026 WID</p>
          <p>Demo build. Names, companies and meetings shown are fictional.</p>
        </div>
      </Container>
    </footer>
  )
}
