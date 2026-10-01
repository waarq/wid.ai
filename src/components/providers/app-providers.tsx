"use client"

import { useEffect, useState, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { makeQueryClient } from "@/lib/query/client"
import { useUIStore } from "@/store/ui-store"

export function AppProviders({ children }: { children: ReactNode }) {
  // Lazy init keeps one client per browser session and one per server request.
  const [queryClient] = useState(makeQueryClient)

  // The UI store skips automatic hydration so SSR markup matches.
  useEffect(() => {
    void useUIStore.persist.rehydrate()
  }, [])

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
