"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

/** Both icons render and CSS picks one, so there is no hydration mismatch. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun aria-hidden className="size-4 dark:hidden" />
      <Moon aria-hidden className="hidden size-4 dark:block" />
    </Button>
  )
}
