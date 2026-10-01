import { useCaptureStore } from "./capture-store"
import { useOnboardingStore } from "./onboarding-store"
import { usePreferencesStore } from "./preferences-store"
import { useUIStore } from "./ui-store"

/*
 * Rehydration policy for persisted Zustand stores (one place, applied to all):
 *
 * 1. Every persisted store sets `skipHydration: true`, so the server render and
 *    the first client render both use the defaults and never mismatch.
 * 2. `AppProviders` calls `rehydratePersistedStores()` in a mount effect, so
 *    stored values arrive right after hydration on every page. Components may
 *    read persisted values directly; they re-render once with the stored value.
 * 3. A component that must not flash defaults (onboarding step, capture timer,
 *    list/grid toggles) gates on `useStoreHydration(store)`, which reports when
 *    that store is ready and also triggers rehydration if it runs first (child
 *    effects run before the provider's).
 *
 * Rehydration is idempotent here: a store that already hydrated is skipped, so
 * calling this repeatedly never replays storage over newer in-memory state.
 */
const PERSISTED_STORES = [useUIStore, usePreferencesStore, useOnboardingStore, useCaptureStore] as const

export function rehydratePersistedStores(): void {
  for (const store of PERSISTED_STORES) {
    if (!store.persist.hasHydrated()) void store.persist.rehydrate()
  }
}
