"use client"

import { RotateCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useRetryProcessing } from "@/hooks"

export function RetryProcessingButton({ meetingId }: { meetingId: string }) {
  const retry = useRetryProcessing()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={retry.isPending}
      onClick={() =>
        retry.mutate(meetingId, {
          onSuccess: () => toast.success("Processing restarted"),
          onError: () => toast.error("We couldn't restart processing. Please try again."),
        })
      }
    >
      <RotateCw aria-hidden />
      {retry.isPending ? "Retrying…" : "Retry"}
    </Button>
  )
}
