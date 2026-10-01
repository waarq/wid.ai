"use client"

import { useLayoutEffect } from "react"

/** Forces the dark palette on <html> while the landing page is mounted, so portals (mobile drawer) match too. */
export function LandingTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement
    const hadDark = root.classList.contains("dark")
    root.classList.add("dark")
    root.style.colorScheme = "dark"
    return () => {
      if (!hadDark) root.classList.remove("dark")
      root.style.colorScheme = ""
    }
  }, [])
  return null
}
