import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/shared/logo"
import { authNav, primaryNav } from "../content/navigation"
import { Container } from "./section"
import { MobileNav } from "./mobile-nav"
import { NavLink } from "./nav-link"
import { NavbarFrame } from "./navbar-frame"
import { ThemeToggle } from "./theme-toggle"

export function MarketingNavbar() {
  return (
    <NavbarFrame>
      <Container className="flex h-14 items-center justify-between gap-6 md:grid md:h-20 md:grid-cols-[1fr_auto_1fr]">
        <Logo size="md" />

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-1 backdrop-blur-md md:flex"
        >
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 md:justify-end">
          <ThemeToggle className="hidden md:inline-flex" />
          <Button asChild variant="ghost" size="lg" className="hidden px-3 md:inline-flex">
            <Link href={authNav.login.href}>{authNav.login.label}</Link>
          </Button>
          <Button asChild size="lg" className="hidden h-9 rounded-full px-5 md:inline-flex">
            <Link href={authNav.register.href}>{authNav.register.label}</Link>
          </Button>
          <MobileNav />
        </div>
      </Container>
    </NavbarFrame>
  )
}
