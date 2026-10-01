import { QueryObserver, type QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query"
import { makeQueryClient } from "@/lib/query/client"
import { services } from "@/services"
import { resetMockWorld } from "@/services/mock/test-helpers"
import type { Transcript } from "@/types"

import { isKeyPrefix } from "./cache-utils"
import { meetingQueryOptions, meetingsQueryOptions, processingStatusQueryOptions } from "./use-meetings"
import { transcriptQueryOptions } from "./use-transcript"

/*
 * Cache behaviour of the meeting hooks, exercised through their option
 * factories with a real QueryClient (no React needed). In Node TanStack
 * treats the environment as a server and disables refetchInterval, so polls
 * are triggered by hand with `refetch()`.
 */

const PHASE_MS = 2500

let queryClient: QueryClient
const unsubscribers: Array<() => void> = []

function observe<T>(options: ConstructorParameters<typeof QueryObserver<T>>[1]): QueryObserver<T> {
  const observer = new QueryObserver<T>(queryClient, options)
  unsubscribers.push(observer.subscribe(() => undefined))
  return observer
}

async function settle(): Promise<void> {
  // Let invalidation-triggered refetches (0ms mock latency) run to completion.
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 5))
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-10-01T09:00:00.000Z"))
  await resetMockWorld()
  queryClient = makeQueryClient()
})

afterEach(() => {
  for (const unsubscribe of unsubscribers.splice(0)) unsubscribe()
  queryClient.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

async function captureAndStop(): Promise<string> {
  const state = await services.capture.start({ title: "Pricing call", mode: "audio" })
  vi.setSystemTime(Date.now() + 20_000)
  await services.capture.stop()
  return state.meetingId!
}

describe("isKeyPrefix", () => {
  it("compares elements by value, exactly", () => {
    expect(isKeyPrefix(["meetings", "list"], ["meetings", "list", { a: 1 }])).toBe(true)
    expect(isKeyPrefix(["meetings", "list", { a: 1, b: 2 }], ["meetings", "list", { b: 2, a: 1 }, "infinite"])).toBe(true)
    expect(isKeyPrefix(["meetings", "list", {}], ["meetings", "list", { a: 1 }])).toBe(false)
    expect(isKeyPrefix(["meetings", "list", "x"], ["meetings", "list"])).toBe(false)
  })
})

describe("processing completion", () => {
  it("lands the ready status once, without a refetch loop, and refreshes dependents", async () => {
    const meetingId = await captureAndStop()
    const spy = vi.spyOn(services.meetings, "getProcessingStatus")

    const transcript = observe<Transcript>(transcriptQueryOptions(meetingId))
    const processing = observe(processingStatusQueryOptions(queryClient, meetingId))
    await settle()
    expect(processing.getCurrentResult().data?.status).toBe("processing")
    expect(transcript.getCurrentResult().data?.status).toBe("pending")

    vi.setSystemTime(Date.now() + PHASE_MS)
    await processing.refetch()
    expect(processing.getCurrentResult().data?.status).toBe("transcribing")

    vi.setSystemTime(Date.now() + PHASE_MS * 2)
    const callsBefore = spy.mock.calls.length
    await processing.refetch()
    await settle()

    expect(processing.getCurrentResult().data?.status).toBe("ready")
    expect(queryClient.getQueryState(queryKeys.meetings.processing(meetingId))?.fetchStatus).toBe("idle")
    // The terminal read plus at most one refresh triggered by the detail query.
    expect(spy.mock.calls.length - callsBefore).toBeLessThanOrEqual(2)
    // The transcript cached while processing was refreshed.
    expect(transcript.getCurrentResult().data?.status).toBe("ready")
    expect(transcript.getCurrentResult().data?.segments.length).toBeGreaterThan(0)
  })

  it("the detail query refreshes its transcript and alerts when it sees Ready", async () => {
    const meetingId = await captureAndStop()
    const detail = observe(meetingQueryOptions(queryClient, meetingId))
    const transcript = observe<Transcript>(transcriptQueryOptions(meetingId))
    const unread = observe<number>({
      queryKey: queryKeys.alerts.unreadCount(),
      queryFn: () => services.alerts.getUnreadCount(),
    })
    await settle()
    const unreadBefore = unread.getCurrentResult().data!
    expect(detail.getCurrentResult().data?.status).toBe("processing")

    const spy = vi.spyOn(services.meetings, "getById")
    vi.setSystemTime(Date.now() + PHASE_MS * 3)
    await detail.refetch()
    await settle()

    expect(detail.getCurrentResult().data?.status).toBe("ready")
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2)
    expect(transcript.getCurrentResult().data?.status).toBe("ready")
    expect(unread.getCurrentResult().data).toBe(unreadBefore + 1)
  })

  it("a list that sees a card finish refreshes that meeting's transcript", async () => {
    const meetingId = await captureAndStop()
    const list = observe(meetingsQueryOptions(queryClient, {}))
    const transcript = observe<Transcript>(transcriptQueryOptions(meetingId))
    await settle()
    expect(list.getCurrentResult().data?.items.find((m) => m.id === meetingId)?.status).toBe("processing")

    const spy = vi.spyOn(services.meetings, "list")
    vi.setSystemTime(Date.now() + PHASE_MS * 3)
    await list.refetch()
    await settle()

    expect(list.getCurrentResult().data?.items.find((m) => m.id === meetingId)?.status).toBe("ready")
    expect(spy.mock.calls.length).toBe(1)
    expect(transcript.getCurrentResult().data?.status).toBe("ready")
  })
})
