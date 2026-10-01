import type { TranscriptSegment } from "@/types"

/** Segments sorted by start time (input is usually sorted already; this keeps search safe). */
export function sortSegments(segments: readonly TranscriptSegment[]): TranscriptSegment[] {
  for (let i = 1; i < segments.length; i++) {
    if (segments[i]!.startTime < segments[i - 1]!.startTime) {
      return [...segments].sort((a, b) => a.startTime - b.startTime)
    }
  }
  return segments as TranscriptSegment[]
}

/**
 * The segment being spoken at `time`: the last segment that has started.
 * Gaps between segments keep the previous speaker, which reads naturally.
 */
export function findActiveSegment(
  sorted: readonly TranscriptSegment[],
  time: number,
): TranscriptSegment | undefined {
  let lo = 0
  let hi = sorted.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid]!.startTime <= time) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found === -1 ? undefined : sorted[found]
}
