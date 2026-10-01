"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Loader2 } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUpdateAction } from "@/hooks/use-action-items"
import { ACTION_ITEM_STATUSES, type ActionItem, type ActionItemStatus, type Participant } from "@/types"

const UNASSIGNED = "__unassigned__"

const STATUS_LABEL: Record<ActionItemStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  dismissed: "Dismissed",
}

const schema = z.object({
  title: z.string().trim().min(1, "Give the action a title.").max(200, "Keep the title under 200 characters."),
  description: z.string().max(1000, "Keep the description under 1000 characters."),
  assigneeId: z.string(),
  dueDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Enter a valid date."),
  status: z.enum(ACTION_ITEM_STATUSES),
})
type FormValues = z.infer<typeof schema>

interface EditActionDialogProps {
  item: ActionItem
  /** Assignee choices: the meeting's participants. */
  participants: readonly Participant[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-destructive">
      {message}
    </p>
  )
}

function EditActionForm({ item, participants, onOpenChange }: Omit<EditActionDialogProps, "open">) {
  const update = useUpdateAction()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: item.title,
      description: item.description ?? "",
      assigneeId: item.assignee?.id ?? UNASSIGNED,
      dueDate: item.dueDate ?? "",
      status: item.status,
    },
  })
  const pending = update.isPending

  // Keep a current assignee selectable even if they are not in the participant list.
  const people =
    item.assignee && !participants.some((p) => p.id === item.assignee?.id)
      ? [...participants, item.assignee]
      : participants

  function onSubmit(values: FormValues) {
    setSubmitError(null)
    update.mutate(
      {
        actionItemId: item.id,
        input: {
          title: values.title.trim(),
          description: values.description.trim() === "" ? null : values.description.trim(),
          assigneeId: values.assigneeId === UNASSIGNED ? null : values.assigneeId,
          dueDate: values.dueDate === "" ? null : values.dueDate,
          status: values.status,
        },
      },
      {
        onSuccess: () => {
          toast.success("Action updated")
          onOpenChange(false)
        },
        onError: (error) => {
          setSubmitError(error.message || "We couldn't save your changes. Please try again.")
          toast.error("We couldn't save that action.")
        },
      },
    )
  }

  const id = `edit-action-${item.id}`
  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={pending} className="space-y-4">
      {submitError ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive-soft p-3 text-sm">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{submitError}</p>
        </div>
      ) : null}

      <div>
        <Label htmlFor={`${id}-title`} className="mb-1.5">Title</Label>
        <Input
          id={`${id}-title`}
          disabled={pending}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
          {...register("title")}
        />
        <FieldError id={`${id}-title-error`} message={errors.title?.message} />
      </div>

      <div>
        <Label htmlFor={`${id}-description`} className="mb-1.5">Description</Label>
        <Textarea
          id={`${id}-description`}
          rows={3}
          disabled={pending}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? `${id}-description-error` : undefined}
          {...register("description")}
        />
        <FieldError id={`${id}-description-error`} message={errors.description?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${id}-assignee`} className="mb-1.5">Assignee</Label>
          <Controller
            control={control}
            name="assigneeId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
                <SelectTrigger id={`${id}-assignee`} className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor={`${id}-due`} className="mb-1.5">Due date</Label>
          <Input
            id={`${id}-due`}
            type="date"
            disabled={pending}
            aria-invalid={Boolean(errors.dueDate)}
            aria-describedby={errors.dueDate ? `${id}-due-error` : undefined}
            className="font-mono tabular-nums"
            {...register("dueDate")}
          />
          <FieldError id={`${id}-due-error`} message={errors.dueDate?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor={`${id}-status`} className="mb-1.5">Status</Label>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={pending}>
              <SelectTrigger id={`${id}-status`} className="w-full sm:w-1/2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_ITEM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {pending ? "Saving" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** "Edit action" dialog (React Hook Form + Zod) backed by useUpdateAction. */
export function EditActionDialog({ item, participants, open, onOpenChange }: EditActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit action</DialogTitle>
          <DialogDescription>Changes apply to this action everywhere it appears.</DialogDescription>
        </DialogHeader>
        <EditActionForm item={item} participants={participants} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}
