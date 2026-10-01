import type { ISODate, ISODateString, Seconds } from "@/types"

/**
 * The single fixed "now" for all demo data. Mock data never reads the system
 * clock, so server and client renders always agree. Thursday, 1 October 2026.
 */
export const MOCK_NOW: ISODateString = "2026-10-01T09:30:00+05:00"
export const MOCK_TIMEZONE = "Asia/Karachi"

const UTC_OFFSET_MINUTES = 300
const MINUTE_MS = 60_000
const ANCHOR_YEAR = 2026
const ANCHOR_MONTH_INDEX = 9
const ANCHOR_DAY = 1

export const MOCK_NOW_MS = Date.parse(MOCK_NOW)

function render(utcMs: number): ISODateString {
  const shifted = new Date(utcMs + UTC_OFFSET_MINUTES * MINUTE_MS)
  return `${shifted.toISOString().slice(0, 19)}+05:00`
}

/** Local (Asia/Karachi) wall-clock time on the day `dayOffset` days from the anchor day. */
export function atDay(dayOffset: number, time = "09:00"): ISODateString {
  const [hours, minutes] = time.split(":").map(Number)
  const utcMs =
    Date.UTC(ANCHOR_YEAR, ANCHOR_MONTH_INDEX, ANCHOR_DAY + dayOffset, hours, minutes) -
    UTC_OFFSET_MINUTES * MINUTE_MS
  return render(utcMs)
}

/** Calendar date (no time) `dayOffset` days from the anchor day. */
export function dateOnly(dayOffset: number): ISODate {
  return new Date(Date.UTC(ANCHOR_YEAR, ANCHOR_MONTH_INDEX, ANCHOR_DAY + dayOffset))
    .toISOString()
    .slice(0, 10)
}

export function plusSeconds(iso: ISODateString, seconds: Seconds): ISODateString {
  return render(Date.parse(iso) + seconds * 1000)
}

export function minutesBeforeNow(minutes: number): ISODateString {
  return render(MOCK_NOW_MS - minutes * MINUTE_MS)
}

/** "mm:ss" or "h:mm:ss" to seconds. */
export function clock(value: string): Seconds {
  const parts = value.split(":").map(Number)
  return parts.reduce((total, part) => total * 60 + part, 0)
}
