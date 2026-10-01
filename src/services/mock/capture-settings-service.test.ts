import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ONBOARDING_DEFAULTS, type UpdateSettingsInput } from "@/types"

import { MockAlertService } from "./alert-service"
import { MockCaptureService } from "./capture-service"
import { mockControls } from "./controls"
import type { MockDb } from "./db"
import { MockMeetingService } from "./meeting-service"
import { MockSettingsService } from "./settings-service"
import { expectAppError, expectTraceable, resetMockWorld } from "./test-helpers"
import { MockTranscriptService } from "./transcript-service"

const meetings = new MockMeetingService()
const transcripts = new MockTranscriptService()
const alerts = new MockAlertService()
const settings = new MockSettingsService()

let db: MockDb
let capture: MockCaptureService

const PHASE_MS = 2500

beforeEach(async () => {
  // Only Date is faked: processing is driven by time since stop, latency timers stay real.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-10-01T09:00:00.000Z"))
  db = await resetMockWorld()
  capture = new MockCaptureService()
})

afterEach(() => {
  vi.useRealTimers()
})

function advance(ms: number): void {
  vi.setSystemTime(Date.now() + ms)
}

describe("capture is always manual", () => {
  it("nothing is capturing until the user starts it", async () => {
    expect(await capture.getState()).toMatchObject({ status: "idle", elapsedSeconds: 0 })
    expect(db.state.meetings.some((m) => m.status === "capturing" || m.status === "paused")).toBe(false)
    expect((await settings.get()).capture.manualCapture).toBe(true)
  })

  it("keeps manualCapture literally true whatever the client sends", async () => {
    const sneaky = { section: "capture", patch: { manualCapture: false, defaultCaptureMode: "video" } } as unknown as UpdateSettingsInput
    const result = await settings.update(sneaky)
    expect(result.capture.manualCapture).toBe(true)
    expect(result.capture.defaultCaptureMode).toBe("video")
  })

  it("does not let the client turn on link sharing availability", async () => {
    const sneaky = { section: "sharing", patch: { linkSharingAvailable: true } } as unknown as UpdateSettingsInput
    const result = await settings.update(sneaky)
    expect(result.sharing.linkSharingAvailable).toBe(false)
  })

  it("ships privacy-first onboarding defaults", () => {
    expect(ONBOARDING_DEFAULTS.sharingPreference).toBe("only_me")
    expect(ONBOARDING_DEFAULTS.capturePreference).toBe("manual")
  })
})

describe("MockCaptureService lifecycle", () => {
  it("start -> pause -> resume -> stop -> processing -> ready, with exact elapsed time", async () => {
    const started = await capture.start({ title: "Customer call", mode: "audio" })
    expect(started.status).toBe("capturing")
    const meetingId = started.meetingId!
    expect((await meetings.getById(meetingId)).status).toBe("capturing")
    // New captures follow the privacy default.
    expect((await meetings.getById(meetingId)).visibility).toBe("private")

    await expectAppError(capture.start({ title: "Second", mode: "audio" }), "conflict")

    advance(30_000)
    await capture.pause()
    advance(60_000) // paused time is not counted
    expect((await capture.getState()).elapsedSeconds).toBe(30)
    await capture.resume()
    advance(15_000)

    const stopped = await capture.stop()
    expect(stopped.id).toBe(meetingId)
    expect(stopped.status).toBe("processing")
    expect((await capture.getState()).elapsedSeconds).toBe(45)

    advance(PHASE_MS)
    expect((await meetings.getProcessingStatus(meetingId)).status).toBe("transcribing")
    advance(PHASE_MS)
    expect((await meetings.getProcessingStatus(meetingId)).status).toBe("understanding")
    expect((await transcripts.getByMeetingId(meetingId)).segments).toEqual([])

    const unreadBefore = await alerts.getUnreadCount()
    advance(PHASE_MS)
    const progress = await meetings.getProcessingStatus(meetingId)
    expect(progress.status).toBe("ready")
    expect(progress.steps.every((s) => s.status === "complete")).toBe(true)

    const ready = await meetings.getById(meetingId)
    expect(ready.status).toBe("ready")
    const transcript = await transcripts.getByMeetingId(meetingId)
    expect(transcript.status).toBe("ready")
    expect(transcript.segments.length).toBeGreaterThan(0)
    const s = ready.summary!
    for (const insight of [...s.decisions, ...s.actionItems, ...s.questions, ...s.risks, ...s.keyMoments]) {
      expect(insight.meetingId).toBe(meetingId)
      expectTraceable(db, insight)
    }

    const readyAlerts = (await alerts.list()).items.filter(
      (a) => a.type === "meeting_ready" && a.target.kind === "meeting" && a.target.meetingId === meetingId,
    )
    expect(readyAlerts).toHaveLength(1)
    expect(await alerts.getUnreadCount()).toBe(unreadBefore + 1)
    expect((await capture.getState()).status).toBe("complete")
  })

  it("fails processing on demand and recovers with retry", async () => {
    const { meetingId } = await capture.start({ title: "Flaky", mode: "audio" })
    advance(5_000)
    mockControls.failNextProcessing()
    await capture.stop()
    advance(PHASE_MS * 2)
    const failed = await meetings.getProcessingStatus(meetingId!)
    expect(failed.status).toBe("failed")
    expect(failed.error?.retryable).toBe(true)
    expect((await capture.getState()).status).toBe("failed")

    const retried = await meetings.retryProcessing(meetingId!)
    expect(retried.status).toBe("processing")
    advance(PHASE_MS * 3)
    expect((await meetings.getById(meetingId!)).status).toBe("ready")
  })

  it("discard removes an ad-hoc capture entirely", async () => {
    const { meetingId } = await capture.start({ title: "Oops", mode: "audio" })
    await capture.discard()
    expect(await capture.getState()).toMatchObject({ status: "idle" })
    await expectAppError(meetings.getById(meetingId!), "not_found")
  })

  it("rejects pause/stop without a running capture", async () => {
    await expectAppError(capture.pause(), "conflict")
    await expectAppError(capture.stop(), "conflict")
    await expectAppError(capture.start({ title: "", mode: "audio" }), "validation_error")
  })
})
