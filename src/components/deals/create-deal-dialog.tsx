"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useId, useState } from "react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateDeal } from "@/hooks"
import { getUserMessage } from "@/lib/utils/errors"
import type { CreateDealInput, CurrencyCode } from "@/types"
import { DEAL_STAGES } from "@/types"

import { STAGE_OPTIONS } from "./deal-meta"

const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "PKR", "AED"]

const schema = z.object({
  company: z.string().trim().min(2, "Enter the company name.").max(80, "Keep the company name under 80 characters."),
  name: z.string().trim().max(120, "Keep the deal name under 120 characters."),
  amount: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 100_000_000), "Enter a positive amount, for example 25000."),
  currency: z.enum(["USD", "EUR", "GBP", "PKR", "AED"]),
  stage: z.enum(DEAL_STAGES),
})
type Values = z.infer<typeof schema>

export function CreateDealDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus aria-hidden /> New deal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {/* Remounted per open so the form always starts clean. */}
        {open ? <CreateDealForm onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function CreateDealForm({ onDone }: { onDone: () => void }) {
  const router = useRouter()
  const create = useCreateDeal()
  const companyId = useId()
  const nameId = useId()
  const amountId = useId()
  const stageId = useId()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { company: "", name: "", amount: "", currency: "USD", stage: "new" },
    mode: "onTouched",
  })
  const { errors } = form.formState

  const submit = form.handleSubmit((values) => {
    const input: CreateDealInput = {
      company: values.company,
      stage: values.stage,
      ...(values.name ? { name: values.name } : {}),
      ...(values.amount ? { value: { amount: Number(values.amount), currency: values.currency } } : {}),
    }
    create.mutate(input, {
      onSuccess: (deal) => {
        toast.success(`${deal.company} added to Deals`)
        onDone()
        router.push(`/deals/${deal.id}`)
      },
    })
  })

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>New deal</DialogTitle>
        <DialogDescription>
          Start tracking a conversation-driven deal. You can link meetings and signals from the deal page.
        </DialogDescription>
      </DialogHeader>

      <fieldset disabled={create.isPending} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor={companyId}>Company</Label>
          <Input
            id={companyId}
            autoComplete="organization"
            placeholder="Meridian Freight"
            aria-invalid={Boolean(errors.company) || undefined}
            aria-describedby={errors.company ? `${companyId}-error` : undefined}
            {...form.register("company")}
          />
          {errors.company ? (
            <p id={`${companyId}-error`} className="text-sm text-destructive">
              {errors.company.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={nameId}>
            Deal name <span className="font-normal text-muted-foreground">Optional</span>
          </Label>
          <Input
            id={nameId}
            aria-invalid={Boolean(errors.name) || undefined}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            {...form.register("name")}
          />
          {errors.name ? (
            <p id={`${nameId}-error`} className="text-sm text-destructive">
              {errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={amountId}>
              Value <span className="font-normal text-muted-foreground">Optional</span>
            </Label>
            <Input
              id={amountId}
              inputMode="decimal"
              placeholder="25000"
              className="font-mono tabular-nums"
              aria-invalid={Boolean(errors.amount) || undefined}
              aria-describedby={errors.amount ? `${amountId}-error` : undefined}
              {...form.register("amount")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Currency</Label>
            <Controller
              control={form.control}
              name="currency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Currency" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {errors.amount ? (
            <p id={`${amountId}-error`} className="col-span-2 text-sm text-destructive">
              {errors.amount.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={stageId}>Stage</Label>
          <Controller
            control={form.control}
            name="stage"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={stageId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </fieldset>

      {create.isError ? (
        <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-foreground">
          {getUserMessage(create.error)} Nothing was saved.
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={create.isPending} onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create deal"}
        </Button>
      </DialogFooter>
    </form>
  )
}
