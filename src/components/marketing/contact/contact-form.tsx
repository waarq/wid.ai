"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { contactSchema, contactTopics, type ContactValues } from "./contact-schema"
import { submitContactMessage } from "./submit-contact"

type Status = "idle" | "success" | "error"

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  )
}

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle")
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  })

  async function onSubmit(values: ContactValues) {
    setStatus("idle")
    try {
      await submitContactMessage(values)
      setStatus("success")
      reset()
    } catch {
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="border-t border-border pt-8">
        <CircleCheck aria-hidden className="size-6 text-primary" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Message sent</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Thanks for getting in touch. This is a demo, so nothing was actually delivered, but this is how the
          confirmation will look.
        </p>
        <Button type="button" variant="outline" size="lg" className="mt-6" onClick={() => setStatus("idle")}>
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-busy={isSubmitting}>
      {status === "error" ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive-soft p-4 text-sm">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>We couldn&rsquo;t send your message. Nothing was lost, so please try again.</p>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name" className="mb-2">
            Name
          </Label>
          <Input
            id="contact-name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            disabled={isSubmitting}
            className="h-10"
            {...register("name")}
          />
          <FieldError id="contact-name-error" message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="contact-email" className="mb-2">
            Email
          </Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            disabled={isSubmitting}
            className="h-10"
            {...register("email")}
          />
          <FieldError id="contact-email-error" message={errors.email?.message} />
        </div>
      </div>

      <div>
        <Label htmlFor="contact-topic" className="mb-2">
          Topic
        </Label>
        <Controller
          control={control}
          name="topic"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
              <SelectTrigger
                id="contact-topic"
                className="h-10 w-full"
                aria-invalid={Boolean(errors.topic)}
                aria-describedby={errors.topic ? "contact-topic-error" : undefined}
                onBlur={field.onBlur}
              >
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                {contactTopics.map((topic) => (
                  <SelectItem key={topic.value} value={topic.value}>
                    {topic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError id="contact-topic-error" message={errors.topic?.message} />
      </div>

      <div>
        <Label htmlFor="contact-message" className="mb-2">
          Message
        </Label>
        <Textarea
          id="contact-message"
          rows={6}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "contact-message-error" : "contact-message-hint"}
          disabled={isSubmitting}
          {...register("message")}
        />
        <p id="contact-message-hint" className="mt-1.5 text-xs text-muted-foreground">
          Up to 2,000 characters.
        </p>
        <FieldError id="contact-message-error" message={errors.message?.message} />
      </div>

      <Button type="submit" size="lg" className="h-10 px-4 text-sm" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 aria-hidden data-icon="inline-start" className="motion-safe:animate-spin" /> : null}
        {isSubmitting ? "Sending" : status === "error" ? "Try again" : "Send message"}
      </Button>
    </form>
  )
}
