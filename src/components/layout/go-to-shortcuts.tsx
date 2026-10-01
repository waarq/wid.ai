"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const TARGETS: Record<string, string> = {
  m: "/my-calls",
  t: "/team-calls",
  p: "/playlist",
  a: "/alerts",
  d: "/deals",
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

/** "G then M" style navigation. Renders nothing. */
export function GoToShortcuts() {
  const router = useRouter()

  useEffect(() => {
    let armedUntil = 0
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
      const key = event.key.toLowerCase()
      if (key === "g") {
        armedUntil = Date.now() + 1000
        return
      }
      const href = TARGETS[key]
      if (href && Date.now() < armedUntil) {
        armedUntil = 0
        event.preventDefault()
        router.push(href)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [router])

  return null
}
