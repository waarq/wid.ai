import type { Metadata } from "next"

import { MeetingDetail } from "@/components/meeting/meeting-detail"

export const metadata: Metadata = { title: "Meeting" }

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** `?t=` deep link: whole seconds, ignored when not a finite non-negative number. */
function parseTime(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : undefined
}

/** `?segment=` deep link: transcript segment ids are short slugs. */
function parseSegment(value: string | undefined): string | undefined {
  return value && /^[\w-]{1,128}$/.test(value) ? value : undefined
}

export default async function MeetingPage(props: PageProps<"/my-calls/[meetingId]">) {
  const [{ meetingId }, searchParams] = await Promise.all([props.params, props.searchParams])
  return (
    <MeetingDetail
      key={meetingId}
      meetingId={meetingId}
      initialTime={parseTime(first(searchParams.t))}
      initialSegmentId={parseSegment(first(searchParams.segment))}
    />
  )
}
