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
      <Container className="flex h-14 items-center justify-between gap-6 md:h-16">
        <Logo size="md" />

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle className="hidden md:inline-flex" />
          <Button asChild variant="ghost" size="lg" className="hidden px-3 md:inline-flex">
            <Link href={authNav.login.href}>{authNav.login.label}</Link>
          </Button>
          <Button asChild size="lg" className="hidden px-3.5 md:inline-flex">
            <Link href={authNav.register.href}>{authNav.register.label}</Link>
          </Button>
          <MobileNav />
        </div>
      </Container>
    </NavbarFrame>
  )
}
