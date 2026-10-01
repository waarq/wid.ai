"use client"

import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useDeleteMeeting } from "@/hooks"
import { getUserMessage } from "@/lib/utils/errors"

/** Confirmed, irreversible delete. `onDeleted` runs after the success toast (e.g. navigate away). */
export function DeleteMeetingDialog({
  open,
  onOpenChange,
  meetingId,
  meetingTitle,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId: string
  meetingTitle: string
  onDeleted?: () => void
}) {
  const remove = useDeleteMeeting()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this meeting?"
      description={
        <>
          <span className="font-medium text-foreground">{meetingTitle}</span> will be removed for everyone it is
          shared with, along with its transcript, notes, action items and saved moments. This can&apos;t be undone.
        </>
      }
      confirmLabel="Delete meeting"
      variant="destructive"
      loading={remove.isPending}
      onConfirm={() =>
        remove.mutate(meetingId, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success("Meeting deleted")
            onDeleted?.()
          },
          onError: (error) => toast.error("Couldn't delete the meeting", { description: getUserMessage(error) }),
        })
      }
    />
  )
}
