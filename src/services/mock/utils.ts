import { AppException } from "@/lib/utils/errors"
import type { ListParams, ListResponse, TextRange } from "@/types"

/* ---------- ids & cloning ---------- */

let idCounter = 0

/** Collision-resistant, sortable-ish id with a domain prefix ("mtg_lx3k9a1b"). */
export function createId(prefix: string): string {
  idCounter = (idCounter + 1) % 1_679_616
  const time = Date.now().toString(36)
  const counter = idCounter.toString(36).padStart(4, "0")
  const random = Math.floor(Math.random() * 1_296).toString(36).padStart(2, "0")
  return `${prefix}_${time}${counter}${random}`
}

/** Deep copy so callers can never mutate the mock database by reference. */
export function clone<T>(value: T): T {
  if (value === undefined || value === null || typeof value !== "object") return value
  return structuredClone(value)
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

/* ---------- pagination ---------- */

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

/**
 * Opaque cursor pagination over an already filtered + sorted array.
 * The cursor encodes an offset; clients must treat it as opaque.
 */
export function paginate<T>(items: T[], params: ListParams = {}): ListResponse<T> {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(params.limit ?? DEFAULT_PAGE_SIZE)))
  let offset = 0
  if (params.cursor) {
    const match = /^o(\d+)$/.exec(params.cursor)
    if (!match) {
      throw new AppException("validation_error", {
        details: { fieldErrors: { cursor: ["Invalid cursor."] } },
        cause: new Error(`Bad cursor ${params.cursor}`),
      })
    }
    offset = Number(match[1])
  }
  const page = items.slice(offset, offset + limit)
  const end = offset + page.length
  return { items: page, total: items.length, nextCursor: end < items.length ? `o${end}` : null }
}

/* ---------- text ---------- */

const STOPWORDS = new Set(
  (
    "a an the and or but if of to in on at by for with about from into over after before is are was were be been " +
    "being do does did done have has had i me my we our us you your he she it its they them their this that these " +
    "those what which who whom whose when where why how can could should would will shall may might must any some " +
    "all there here then than so not no yes up out as just also very too s t get got let lets let's tell show give " +
    "please meeting call"
  ).split(" "),
)

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
}

/** Light stemmer: enough to match launch/launched/launching, risk/risks. */
export function stem(token: string): string {
  if (token.length <= 4) return token
  for (const suffix of ["ing", "ed", "es", "s"]) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 4) return token.slice(0, -suffix.length)
  }
  return token
}

export function rawTokens(text: string): string[] {
  return normalize(text).match(/[a-z0-9]+(?:'[a-z]+)?/g) ?? []
}

/** Lowercased, stemmed content words (stopwords removed). */
export function tokenize(text: string): string[] {
  return rawTokens(text)
    .map((t) => t.replace(/'[a-z]+$/, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem)
}

export function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text))
}

/**
 * Character ranges in `text` where any query token (or the whole phrase)
 * starts a word. Ranges are sorted and non-overlapping.
 */
export function findHighlights(text: string, query: string): TextRange[] {
  const haystack = normalize(text)
  const needles = Array.from(new Set([normalize(query).trim(), ...rawTokens(query).filter((t) => t.length > 1)]))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  const ranges: TextRange[] = []
  for (const needle of needles) {
    let from = 0
    while (from <= haystack.length) {
      const index = haystack.indexOf(needle, from)
      if (index === -1) break
      const atWordStart = index === 0 || !/[a-z0-9]/.test(haystack[index - 1])
      if (atWordStart && !ranges.some((r) => index < r.end && index + needle.length > r.start)) {
        ranges.push({ start: index, end: index + needle.length })
      }
      from = index + needle.length
    }
  }
  return ranges.sort((a, b) => a.start - b.start)
}

/** Trims long text around the first highlight, shifting ranges to match. */
export function makeSnippet(
  text: string,
  ranges: TextRange[],
  maxLength = 160,
): { snippet: string; highlights: TextRange[] } {
  if (text.length <= maxLength) return { snippet: text, highlights: ranges }
  const first = ranges[0]?.start ?? 0
  let start = Math.max(0, first - Math.floor(maxLength / 3))
  // Snap to a word boundary.
  if (start > 0) {
    const space = text.lastIndexOf(" ", start)
    start = space === -1 ? start : space + 1
  }
  const end = Math.min(text.length, start + maxLength)
  const prefix = start > 0 ? "..." : ""
  const suffix = end < text.length ? "..." : ""
  const snippet = `${prefix}${text.slice(start, end).trim()}${suffix}`
  const shift = prefix.length - start
  const highlights = ranges
    .filter((r) => r.start >= start && r.end <= end)
    .map((r) => ({ start: r.start + shift, end: r.end + shift }))
  return { snippet, highlights }
}

/** Emails accepted by share invites (pragmatic, not RFC-complete). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export function notFound(what: string, id: string): AppException {
  return new AppException("not_found", { cause: new Error(`${what} ${id} not found`) })
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = String(safe % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${String(m).padStart(2, "0")}:${s}`
}
