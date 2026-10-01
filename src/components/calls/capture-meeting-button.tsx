"use client"

import { useState, type ComponentProps } from "react"
import { Mic } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCaptureController } from "@/hooks"
import { getUserMessage } from "@/lib/utils/errors"

/**
 * "Capture meeting" entry point (My Calls header, empty states).
 *
 * PHASE 3 HOOK POINT: this is a thin dialog over `useCaptureController().start`.
 * Phase 3 replaces the success branch with the real capture panel / navigation.
 */
export function CaptureMeetingButton({
  variant = "default",
  size = "default",
  label = "Capture meeting",
}: {
  variant?: ComponentProps<typeof Button>["variant"]
  size?: ComponentProps<typeof Button>["size"]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const capture = useCaptureController()

  function handleStart() {
    capture.start.mutate(
      { title: title.trim() || undefined, mode: "audio" },
      {
        onSuccess: () => {
          setOpen(false)
          setTitle("")
          toast.success("Capture started")
        },
        onError: (error) => toast.error(getUserMessage(error)),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Mic data-icon="inline-start" aria-hidden />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Capture a meeting</DialogTitle>
          <DialogDescription>
            WIT only records when you tell it to. Start capture here, then stop when the meeting ends. Notes, decisions
            and action items are ready a few minutes later. Nothing is recorded until you press Start capture.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="capture-title">Meeting title (optional)</Label>
          <Input
            id="capture-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product Planning"
            maxLength={120}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={capture.start.isPending}>
            {capture.start.isPending ? "Starting…" : "Start capture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
