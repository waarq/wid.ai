"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Sticky from the first paint, so scrolling never shifts layout. Only the
 * border and backdrop change, driven by a passive IntersectionObserver watching
 * a sentinel at the top of the document (no scroll listener).
 */
export function NavbarFrame({ children }: { children: ReactNode }) {
  const sentinel = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const node = sentinel.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), {
      rootMargin: "0px",
      threshold: 0,
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div
        ref={sentinel}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-6 w-px"
      />
      <header
        data-scrolled={scrolled}
        className={cn(
          "sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-200",
          "data-[scrolled=true]:border-border data-[scrolled=true]:bg-background/85 data-[scrolled=true]:backdrop-blur-md",
        )}
      >
        {children}
      </header>
    </>
  )
}
