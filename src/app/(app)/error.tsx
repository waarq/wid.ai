"use client"

import { ErrorState } from "@/components/shared/error-state"

export default function AppError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  // The raw error is intentionally never rendered.
  return (
    <ErrorState
      title="Something went wrong on this page."
      description="Your meetings and notes are safe. Try again, and if it keeps happening, reload the app."
      onRetry={unstable_retry}
    />
  )
}
