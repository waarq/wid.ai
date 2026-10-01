"use client"

import { useEffect, useState } from "react"

/** The slice of Zustand's persist API this helper needs. */
interface PersistApi {
  persist: {
    rehydrate: () => Promise<void> | void
    hasHydrated: () => boolean
    onFinishHydration: (listener: () => void) => () => void
  }
}

/**
 * Persisted stores use `skipHydration: true` so the server render and the
 * first client render agree. Call this in the component that first needs the
 * persisted values: it rehydrates once after mount and reports when done.
 *
 *   const hydrated = useStoreHydration(useOnboardingStore)
 *   if (!hydrated) return <OnboardingSkeleton />
 */
export function useStoreHydration(store: PersistApi): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const unsubscribe = store.persist.onFinishHydration(() => setHydrated(true))
    if (store.persist.hasHydrated()) {
      // Already hydrated by another component: sync on the next microtask
      // rather than calling setState synchronously inside the effect.
      queueMicrotask(() => setHydrated(true))
    } else {
      void store.persist.rehydrate()
    }
    return unsubscribe
  }, [store])

  return hydrated
}
