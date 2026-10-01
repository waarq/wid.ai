import Link from "next/link"

import { cn } from "@/lib/utils"

interface LogoProps {
  href?: string
  className?: string
  /** Visible size of the wordmark. */
  size?: "sm" | "md" | "lg"
}

const sizes = { sm: "text-base", md: "text-lg", lg: "text-2xl" } as const

export function Logo({ href = "/", className, size = "md" }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="WID home"
      className={cn(
        "inline-flex items-baseline gap-px rounded-sm font-semibold tracking-tight text-foreground",
        sizes[size],
        className
      )}
    >
      WID
      <span aria-hidden className="size-1.5 rounded-full bg-primary" />
    </Link>
  )
}
