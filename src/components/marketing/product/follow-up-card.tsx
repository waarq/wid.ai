"use client"

import { Check, Copy, Pencil } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface FollowUpCardProps {
  subject: string
  body: string
  recipients: string[]
}

/** Follow-up email with working Copy and Edit. Sending is not part of the demo. */
export function FollowUpCard({ subject, body, recipients }: FollowUpCardProps) {
  const [text, setText] = useState(body)
  const [editing, setEditing] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Follow-up copied to clipboard")
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error("Couldn’t copy. Select the text and copy it manually.")
    }
  }

  return (
    <figure aria-label="Meeting follow-up" className="rounded-xl border border-border bg-card shadow-float">
      <div className="space-y-1 border-b border-border px-5 py-4 sm:px-7">
        <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">Meeting follow-up</p>
        <p className="text-sm">
          <span className="text-muted-foreground">Subject: </span>
          <span className="font-medium">{subject}</span>
        </p>
        <p className="text-xs text-muted-foreground">To: {recipients.join(", ")}</p>
      </div>
      <div className="px-5 py-5 sm:px-7">
        {editing ? (
          <>
            <label htmlFor="follow-up-body" className="sr-only">
              Edit follow-up email
            </label>
            <Textarea
              id="follow-up-body"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-72 text-sm leading-relaxed"
            />
          </>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-border px-5 py-3 sm:px-7">
        <Button type="button" size="lg" onClick={copy}>
          {copied ? <Check aria-hidden data-icon="inline-start" /> : <Copy aria-hidden data-icon="inline-start" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => setEditing((v) => !v)}>
          <Pencil aria-hidden data-icon="inline-start" />
          {editing ? "Done" : "Edit"}
        </Button>
        <p className="ml-auto hidden text-xs text-muted-foreground sm:block">Nothing is sent automatically.</p>
      </div>
    </figure>
  )
}
