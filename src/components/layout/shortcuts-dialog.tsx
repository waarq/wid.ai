"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { KEYBOARD_SHORTCUTS } from "./nav-config"
import { useModKeyLabel } from "./use-mod-key"

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const mod = useModKeyLabel()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move around WIT without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border text-sm">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.label} className="flex items-center justify-between gap-4 py-2">
              <span>{shortcut.label}</span>
              <span className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && shortcut.keys[0] === "G" ? <span className="text-xs text-muted-foreground">then</span> : null}
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {key === "mod" ? mod : key}
                    </kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
