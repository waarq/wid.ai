import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"

interface UIState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  commandPaletteOpen: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
}

/** localStorage can throw (SSR, private mode, blocked storage). */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value)
    } catch {
      // Ignore: preference simply will not persist.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // Ignore.
    }
  },
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      commandPaletteOpen: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () =>
        set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
    }),
    {
      name: "wid-ui",
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? noopStorage : safeStorage
      ),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
      // Hydrate after mount so server and first client render match.
      skipHydration: true,
    }
  )
)
