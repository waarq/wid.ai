"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Pencil, Plus } from "lucide-react"
import { useId, useState } from "react"
import { useForm } from "react-hook-form"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUpdateDeal } from "@/hooks"
import { getUserMessage } from "@/lib/utils/errors"
import type { Deal } from "@/types"

const schema = z.object({
  title: z.string().trim().min(2, "Describe the next step in a few words.").max(140, "Keep it under 140 characters."),
  dueDate: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date."),
})
type Values = z.infer<typeof schema>

export function NextActionEditor({ deal }: { deal: Deal }) {
  const [open, setOpen] = useState(false)
  const existing = deal.nextAction
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {existing ? <Pencil aria-hidden /> : <Plus aria-hidden />}
          {existing ? "Edit" : "Set next action"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {open ? <EditorForm deal={deal} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function EditorForm({ deal, onDone }: { deal: Deal; onDone: () => void }) {
  const update = useUpdateDeal()
  const titleId = useId()
  const dueId = useId()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: deal.nextAction?.title ?? "", dueDate: deal.nextAction?.dueDate ?? "" },
    mode: "onTouched",
  })
  const { errors } = form.formState

  const save = form.handleSubmit((values) => {
    update.mutate(
      {
        dealId: deal.id,
        input: {
          nextAction: {
            title: values.title,
            ...(values.dueDate ? { dueDate: values.dueDate } : {}),
            ...(deal.nextAction?.actionItemId ? { actionItemId: deal.nextAction.actionItemId } : {}),
          },
        },
      },
      {
        onSuccess: () => {
          toast.success("Next action updated")
          onDone()
        },
      },
    )
  })

  function clear() {
    update.mutate(
      { dealId: deal.id, input: { nextAction: null } },
      {
        onSuccess: () => {
          toast.success("Next action cleared")
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={(e) => void save(e)} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Next action</DialogTitle>
        <DialogDescription>The one thing that moves {deal.company} forward.</DialogDescription>
      </DialogHeader>
      <fieldset disabled={update.isPending} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={titleId}>What needs to happen</Label>
          <Input
            id={titleId}
            placeholder="Send revised proposal"
            aria-invalid={Boolean(errors.title) || undefined}
            aria-describedby={errors.title ? `${titleId}-error` : undefined}
            {...form.register("title")}
          />
          {errors.title ? (
            <p id={`${titleId}-error`} className="text-sm text-destructive">
              {errors.title.message}
            </p>
          ) : null}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={dueId}>
            Due date <span className="font-normal text-muted-foreground">Optional</span>
          </Label>
          <Input
            id={dueId}
            type="date"
            className="w-44 font-mono tabular-nums"
            aria-invalid={Boolean(errors.dueDate) || undefined}
            aria-describedby={errors.dueDate ? `${dueId}-error` : undefined}
            {...form.register("dueDate")}
          />
          {errors.dueDate ? (
            <p id={`${dueId}-error`} className="text-sm text-destructive">
              {errors.dueDate.message}
            </p>
          ) : null}
        </div>
      </fieldset>
      {update.isError ? (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-foreground">
          {getUserMessage(update.error)} Nothing was changed.
        </p>
      ) : null}
      <DialogFooter className="sm:justify-between">
        {deal.nextAction ? (
          <Button type="button" variant="ghost" disabled={update.isPending} onClick={clear}>
            Clear
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={update.isPending} onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
