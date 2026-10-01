"use client"

import { useEffect, useState } from "react"

/**
 * "Redirecting…" state for redirect-based OAuth. The connect mutation settles
 * before the browser actually leaves, so this keeps the button disabled until
 * navigation. Resets on a back/forward-cache restore (user pressed Back).
 */
export function useRedirecting() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setActive(false)
    }
    window.addEventListener("pageshow", onShow)
    return () => window.removeEventListener("pageshow", onShow)
  }, [])

  function begin(url: string) {
    setActive(true)
    window.location.assign(url)
  }

  return { active, begin }
}
