import { createJSONStorage, type PersistStorage, type StateStorage } from "zustand/middleware"

/*
 * Storage adapters shared by the persisted Zustand stores.
 *
 * Web Storage can throw (SSR, private mode, quota, blocked storage), so every
 * access is guarded and failures degrade to "not persisted". Only UI state and
 * non-sensitive preferences are ever written here: never tokens, credentials
 * or server data.
 */

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

type WebStorageKind = "localStorage" | "sessionStorage"

function guardedStorage(kind: WebStorageKind): StateStorage {
  return {
    getItem: (name) => {
      try {
        return window[kind].getItem(name)
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      try {
        window[kind].setItem(name, value)
      } catch {
        // Ignore: the value simply will not persist.
      }
    },
    removeItem: (name) => {
      try {
        window[kind].removeItem(name)
      } catch {
        // Ignore.
      }
    },
  }
}

function resolve(kind: WebStorageKind): StateStorage {
  return typeof window === "undefined" ? noopStorage : guardedStorage(kind)
}

/** JSON storage over localStorage that is safe to construct during SSR. */
export function safeLocalStorage<S>(): PersistStorage<S> | undefined {
  return createJSONStorage<S>(() => resolve("localStorage"))
}

/** JSON storage over sessionStorage (per-tab, cleared when the tab closes). */
export function safeSessionStorage<S>(): PersistStorage<S> | undefined {
  return createJSONStorage<S>(() => resolve("sessionStorage"))
}
