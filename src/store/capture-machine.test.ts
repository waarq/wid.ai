import { describe, expect, it } from "vitest"

import {
  INITIAL_CAPTURE_SESSION,
  canTransition,
  formatCaptureClock,
  getElapsedMs,
  getElapsedSeconds,
  isActiveCaptureStatus,
  toCaptureState,
  transition,
  type CaptureEvent,
  type CaptureSession,
} from "./capture-machine"

const T0 = 1_000_000

function run(events: CaptureEvent[], from: CaptureSession = INITIAL_CAPTURE_SESSION): CaptureSession {
  return events.reduce(transition, from)
}

const capturing = (): CaptureSession =>
  run([{ type: "start", at: T0, meetingId: "mtg_1", title: "Standup", mode: "audio" }])

describe("transition", () => {
  it("prepares from idle with the chosen title and mode", () => {
    const next = transition(INITIAL_CAPTURE_SESSION, { type: "prepare", title: "Sync", mode: "video" })
    expect(next).toMatchObject({ status: "ready", title: "Sync", mode: "video", accumulatedMs: 0 })
  })

  it("starts from idle or ready and keeps prepared details", () => {
    const ready = transition(INITIAL_CAPTURE_SESSION, { type: "prepare", title: "Sync", mode: "video", calendarEventId: "evt_1" })
    const started = transition(ready, { type: "start", at: T0, meetingId: "mtg_1" })
    expect(started).toMatchObject({
      status: "capturing",
      meetingId: "mtg_1",
      title: "Sync",
      mode: "video",
      calendarEventId: "evt_1",
      startedAt: T0,
      segmentStartedAt: T0,
      accumulatedMs: 0,
    })
  })

  it("walks the full happy path to complete", () => {
    const session = run([
      { type: "prepare" },
      { type: "start", at: T0, meetingId: "mtg_1" },
      { type: "pause", at: T0 + 10_000 },
      { type: "resume", at: T0 + 20_000 },
      { type: "stop", at: T0 + 25_000 },
      { type: "advance", to: "transcribing" },
      { type: "advance", to: "understanding" },
      { type: "advance", to: "complete" },
    ])
    expect(session.status).toBe("complete")
    expect(session.accumulatedMs).toBe(15_000)
    expect(session.stoppedAt).toBe(T0 + 25_000)
    expect(session.segmentStartedAt).toBeUndefined()
  })

  it("returns the same reference for invalid transitions", () => {
    const idle = INITIAL_CAPTURE_SESSION
    for (const event of [
      { type: "pause", at: T0 },
      { type: "resume", at: T0 },
      { type: "stop", at: T0 },
      { type: "advance", to: "complete" },
      { type: "fail", at: T0, error: "x" },
    ] satisfies CaptureEvent[]) {
      expect(transition(idle, event)).toBe(idle)
    }
    const live = capturing()
    expect(transition(live, { type: "start", at: T0 })).toBe(live)
    expect(transition(live, { type: "resume", at: T0 })).toBe(live)
    expect(transition(live, { type: "prepare" })).toBe(live)
  })

  it("only advances forward through processing, allowing skips", () => {
    const processing = transition(capturing(), { type: "stop", at: T0 + 1000 })
    expect(processing.status).toBe("processing")
    const understanding = transition(processing, { type: "advance", to: "understanding" })
    expect(understanding.status).toBe("understanding")
    expect(transition(understanding, { type: "advance", to: "transcribing" })).toBe(understanding)
    expect(transition(understanding, { type: "advance", to: "understanding" })).toBe(understanding)
    // Advance is not valid while still recording.
    const live = capturing()
    expect(transition(live, { type: "advance", to: "complete" })).toBe(live)
  })

  it("fails from recording or processing, records where it failed and banks time", () => {
    const failed = transition(capturing(), { type: "fail", at: T0 + 4000, error: "Microphone lost" })
    expect(failed).toMatchObject({ status: "failed", failedFrom: "capturing", error: "Microphone lost", accumulatedMs: 4000 })
    expect(failed.segmentStartedAt).toBeUndefined()

    const processing = transition(capturing(), { type: "stop", at: T0 + 1000 })
    expect(transition(processing, { type: "fail", at: T0 + 9000, error: "x" })).toMatchObject({
      failedFrom: "processing",
      accumulatedMs: 1000,
    })
    // Complete and failed are terminal for "fail".
    const complete = transition(processing, { type: "advance", to: "complete" })
    expect(transition(complete, { type: "fail", at: T0, error: "x" })).toBe(complete)
  })

  it("can re-prepare after complete or failed, but not mid-capture", () => {
    const failed = transition(capturing(), { type: "fail", at: T0 + 10, error: "x" })
    expect(canTransition(failed, { type: "prepare" })).toBe(true)
    expect(transition(failed, { type: "prepare", title: "Again" })).toMatchObject({ status: "ready", title: "Again", accumulatedMs: 0 })
    expect(canTransition(failed, { type: "start", at: T0 })).toBe(false)
  })

  it("reset returns the frozen initial session, and is a no-op when already idle", () => {
    expect(transition(capturing(), { type: "reset" })).toBe(INITIAL_CAPTURE_SESSION)
    expect(transition(INITIAL_CAPTURE_SESSION, { type: "reset" })).toBe(INITIAL_CAPTURE_SESSION)
    expect(Object.isFrozen(INITIAL_CAPTURE_SESSION)).toBe(true)
  })

  it("stop keeps the existing meeting id unless a new one is given", () => {
    expect(transition(capturing(), { type: "stop", at: T0 + 1 }).meetingId).toBe("mtg_1")
    expect(transition(capturing(), { type: "stop", at: T0 + 1, meetingId: "mtg_2" }).meetingId).toBe("mtg_2")
  })

  it("never banks negative time when the clock goes backwards", () => {
    const paused = transition(capturing(), { type: "pause", at: T0 - 5000 })
    expect(paused.accumulatedMs).toBe(0)
  })
})

describe("getElapsedMs", () => {
  it("is zero before capture starts", () => {
    expect(getElapsedMs(INITIAL_CAPTURE_SESSION, T0)).toBe(0)
  })

  it("counts the running stretch while capturing", () => {
    expect(getElapsedMs(capturing(), T0 + 7_500)).toBe(7_500)
    expect(getElapsedSeconds(capturing(), T0 + 7_999)).toBe(7)
  })

  it("excludes paused time and freezes while paused", () => {
    const paused = run([{ type: "pause", at: T0 + 3_000 }], capturing())
    expect(getElapsedMs(paused, T0 + 60_000)).toBe(3_000)
    const resumed = transition(paused, { type: "resume", at: T0 + 60_000 })
    expect(getElapsedMs(resumed, T0 + 62_000)).toBe(5_000)
  })

  it("is fixed after stop", () => {
    const stopped = transition(capturing(), { type: "stop", at: T0 + 9_000 })
    expect(getElapsedMs(stopped, T0 + 999_999)).toBe(9_000)
  })

  it("never goes negative when now is before the segment start", () => {
    expect(getElapsedMs(capturing(), T0 - 1_000)).toBe(0)
  })
})

describe("helpers", () => {
  it("projects to the public CaptureState", () => {
    const state = toCaptureState(capturing(), T0 + 2_000)
    expect(state).toEqual({
      status: "capturing",
      elapsedSeconds: 2,
      meetingId: "mtg_1",
      mode: "audio",
      startedAt: new Date(T0).toISOString(),
    })
  })

  it("formats the capture clock", () => {
    expect(formatCaptureClock(0)).toBe("00:00")
    expect(formatCaptureClock(65)).toBe("01:05")
    expect(formatCaptureClock(3_725)).toBe("1:02:05")
    expect(formatCaptureClock(-4)).toBe("00:00")
  })

  it("classifies active statuses", () => {
    expect(isActiveCaptureStatus("capturing")).toBe(true)
    expect(isActiveCaptureStatus("understanding")).toBe(true)
    expect(isActiveCaptureStatus("ready")).toBe(false)
    expect(isActiveCaptureStatus("complete")).toBe(false)
  })
})
