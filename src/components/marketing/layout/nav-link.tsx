"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

interface NavLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string
}

/** Link that exposes aria-current when its path is the current page. Hash links are never current. */
export function NavLink({ href, className, ...props }: NavLinkProps) {
  const pathname = usePathname()
  const current = !href.includes("#") && pathname === href
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(className, current && "text-foreground")}
      {...props}
    />
  )
}
