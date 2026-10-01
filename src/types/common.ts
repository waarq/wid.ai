/**
 * Shared primitives used across every domain.
 *
 * Units are encoded in the alias name so call sites stay self-documenting:
 * - `ISODateString`: an ISO 8601 timestamp (e.g. "2026-10-01T09:30:00.000Z").
 * - `ISODate`: a calendar date without time (e.g. "2026-10-04"), used for due dates.
 * - `Seconds`: a duration or media offset in whole or fractional seconds.
 */

export type ISODateString = string
export type ISODate = string
export type Seconds = number

/** Lightweight reference to a person (WIT user, attendee or external contact). */
export interface PersonRef {
  id: string
  name: string
  email?: string
  avatarUrl?: string
}

/** Lightweight reference to a meeting, embedded wherever an entity points back at its source. */
export interface MeetingRef {
  id: string
  title: string
  startedAt: ISODateString
}

/**
 * Traceability contract. Every AI-generated insight carries the meeting,
 * transcript segment and media offset it was derived from, so the UI can
 * always render "Source: Product Planning · 01:15 [Jump to conversation]".
 */
export interface Traceable {
  meetingId: string
  /** `TranscriptSegment.id` the insight was extracted from. */
  sourceSegmentId: string
  /** Offset into the recording, in seconds. */
  sourceTimestamp: Seconds
}

/** Character offsets into a text snippet, used for search highlighting. */
export interface TextRange {
  start: number
  end: number
}

/** Cursor pagination input shared by every list endpoint. */
export interface ListParams {
  cursor?: string
  limit?: number
}

/** Envelope for every paginated collection. `nextCursor` is null on the last page. */
export interface ListResponse<T> {
  items: T[]
  total: number
  nextCursor: string | null
}

export type CurrencyCode = "USD" | "EUR" | "GBP" | "PKR" | "AED"

/** Monetary amount in major currency units (25000 = $25,000). */
export interface Money {
  amount: number
  currency: CurrencyCode
}

/** Visual tone for tags and labels. Maps onto design tokens, never raw colors. */
export type Tone = "neutral" | "accent" | "info" | "warning" | "danger"

/** Any JSON-serialisable value. Used at the HTTP boundary. */
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
