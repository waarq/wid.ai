"use client"

import { useSyncExternalStore } from "react"

const subscribe = () => () => undefined

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)
}

/**
 * "⌘" on Apple platforms, "Ctrl" elsewhere. The server snapshot is "Ctrl",
 * so hydration matches and macOS re-renders with "⌘" right after mount.
 */
export function useModKeyLabel(): string {
  return useSyncExternalStore(
    subscribe,
    () => (isApplePlatform() ? "⌘" : "Ctrl"),
    () => "Ctrl",
  )
}
