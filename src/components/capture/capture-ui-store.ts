"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { create } from "zustand"

import type { CaptureMode } from "@/types"

/*
 * Ephemeral UI state for the capture surfaces (not persisted, no server data).
 * The capture session itself lives in `useCaptureStore` (@/store).
 */

export interface StartCapturePreset {
  calendarEventId?: string
  title?: string
  mode?: CaptureMode
}

interface CaptureUIState {
  startOpen: boolean
  preset: StartCapturePreset | undefined
  dockCollapsed: boolean
  openStart: (preset?: StartCapturePreset) => void
  closeStart: () => void
  setDockCollapsed: (collapsed: boolean) => void
}

export const useCaptureUIStore = create<CaptureUIState>()((set) => ({
  startOpen: false,
  preset: undefined,
  dockCollapsed: false,
  openStart: (preset) => set({ startOpen: true, preset }),
  closeStart: () => set({ startOpen: false }),
  setDockCollapsed: (dockCollapsed) => set({ dockCollapsed }),
}))

/* ---------- single host ---------- */

/*
 * The capture host (start dialog, floating dock, ready toast) may be mounted
 * by several surfaces at once (My Calls header, empty states, the meeting
 * page, the app shell). Only the first mounted instance renders.
 */
const hosts: symbol[] = []
const hostListeners = new Set<() => void>()

function notifyHosts(): void {
  for (const listener of hostListeners) listener()
}

function subscribeHosts(listener: () => void): () => void {
  hostListeners.add(listener)
  return () => hostListeners.delete(listener)
}

export function useIsPrimaryCaptureHost(): boolean {
  const [id] = useState(() => Symbol("capture-host"))
  useEffect(() => {
    hosts.push(id)
    notifyHosts()
    return () => {
      const index = hosts.indexOf(id)
      if (index !== -1) hosts.splice(index, 1)
      notifyHosts()
    }
  }, [id])
  return useSyncExternalStore(
    subscribeHosts,
    () => hosts[0] === id,
    () => false,
  )
}
