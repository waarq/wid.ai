import { describe, expect, it } from "vitest"

import { INITIAL_CAPTURE_SESSION } from "./capture-machine"
import { sanitizeCaptureSession, useCaptureStore } from "./capture-store"
import { useOnboardingStore } from "./onboarding-store"
import { rehydratePersistedStores } from "./persisted"
import { usePreferencesStore } from "./preferences-store"
import { useUIStore } from "./ui-store"

const stores = [useUIStore, usePreferencesStore, useOnboardingStore, useCaptureStore]

describe("rehydratePersistedStores", () => {
  it("does not hydrate on import (SSR-safe), then hydrates every store once", async () => {
    for (const store of stores) expect(store.persist.hasHydrated()).toBe(false)
    rehydratePersistedStores()
    await Promise.resolve()
    for (const store of stores) expect(store.persist.hasHydrated()).toBe(true)

    // Idempotent: newer in-memory state is never replaced by a second call.
    usePreferencesStore.getState().setMeetingsView("grid")
    rehydratePersistedStores()
    await Promise.resolve()
    expect(usePreferencesStore.getState().meetingsView).toBe("grid")
  })
})

describe("sanitizeCaptureSession", () => {
  it("keeps a valid stored session", () => {
    const session = sanitizeCaptureSession({
      status: "paused",
      accumulatedMs: 12_000,
      meetingId: "mtg_1",
      mode: "audio",
      startedAt: 1,
    })
    expect(session).toMatchObject({ status: "paused", accumulatedMs: 12_000, meetingId: "mtg_1", mode: "audio", startedAt: 1 })
  })

  it.each([
    [null],
    ["capturing"],
    [{ status: "recording", accumulatedMs: 0 }],
    [{ status: "capturing" }],
    [{ status: "capturing", accumulatedMs: -5 }],
    [{ status: "capturing", accumulatedMs: Number.NaN }],
  ])("resets malformed value %j to idle", (value) => {
    expect(sanitizeCaptureSession(value)).toBe(INITIAL_CAPTURE_SESSION)
  })

  it("drops invalid optional fields", () => {
    const session = sanitizeCaptureSession({ status: "failed", accumulatedMs: 0, mode: "hologram", failedFrom: "nope", meetingId: 5 })
    expect(session.mode).toBeUndefined()
    expect(session.failedFrom).toBeUndefined()
    expect(session.meetingId).toBeUndefined()
  })
})
