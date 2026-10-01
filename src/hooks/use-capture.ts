"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useSyncExternalStore } from "react"

import { queryKeys } from "@/lib/query"
import { USER_SAFE_MESSAGES } from "@/lib/utils/errors"
import { services } from "@/services"
import { getElapsedSeconds, isProcessingCaptureStatus, isRecordingStatus } from "@/store/capture-machine"
import {
  selectCaptureError,
  selectCaptureMeetingId,
  selectCaptureSession,
  selectCaptureStatus,
  useCaptureStore,
} from "@/store/capture-store"
import { useStoreHydration } from "@/store/hydration"
import type { CaptureMode, Meeting, StartCaptureInput } from "@/types"

import { invalidateMeetingDependents, useProcessingStatus } from "./use-meetings"

/* ---------- shared clock ---------- */

/*
 * One ticker for every timer on the page. It only drives re-renders; the
 * elapsed value itself comes from timestamps, so throttled background tabs
 * and pauses never drift. Ticks immediately when the tab becomes visible.
 */
const TICK_MS = 250
let tickNow = 0
const tickListeners = new Set<() => void>()
let tickTimer: ReturnType<typeof setInterval> | undefined

function emitTick(): void {
  tickNow = Date.now()
  for (const listener of tickListeners) listener()
}

function onVisibility(): void {
  if (document.visibilityState === "visible") emitTick()
}

function subscribeTicker(listener: () => void): () => void {
  tickListeners.add(listener)
  if (!tickTimer) {
    tickNow = Date.now()
    tickTimer = setInterval(emitTick, TICK_MS)
    document.addEventListener("visibilitychange", onVisibility)
  }
  return () => {
    tickListeners.delete(listener)
    if (tickListeners.size === 0 && tickTimer) {
      clearInterval(tickTimer)
      tickTimer = undefined
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }
}

const noopSubscribe = () => () => undefined
const getTick = () => tickNow
const getServerTick = () => 0

/** Live elapsed capture seconds (excludes paused time). Re-renders ~4x/s only while capturing. */
export function useCaptureElapsedSeconds(): number {
  const session = useCaptureStore(selectCaptureSession)
  const now = useSyncExternalStore(
    session.status === "capturing" ? subscribeTicker : noopSubscribe,
    getTick,
    getServerTick,
  )
  return getElapsedSeconds(session, now)
}

/* ---------- controller ---------- */

/**
 * The capture flow in one hook: Start -> timer -> Pause/Resume -> Stop ->
 * processing -> transcribing -> understanding -> complete (or failed).
 *
 * - The recorder lives behind `services.capture` (mocked today; a real
 *   MediaRecorder/SDK implementation plugs in there).
 * - UI state lives in `useCaptureStore` (pure machine, timestamps).
 * - After Stop, server processing is followed through useProcessingStatus and
 *   mirrored into the store until the meeting is ready.
 *
 * Mutations resolve with typed AppErrors; the UI decides on toasts.
 */
export function useCaptureController() {
  const queryClient = useQueryClient()
  const hydrated = useStoreHydration(useCaptureStore)
  const session = useCaptureStore(selectCaptureSession)
  const status = useCaptureStore(selectCaptureStatus)
  const meetingId = useCaptureStore(selectCaptureMeetingId)
  const error = useCaptureStore(selectCaptureError)

  // Recorder-driven failures (device lost, permission revoked) reach the store here.
  useEffect(
    () =>
      services.capture.subscribe((state) => {
        const store = useCaptureStore.getState()
        // Only failures of the session this store is tracking (not a stale one).
        if (state.status === "failed" && state.meetingId && state.meetingId === store.session.meetingId) {
          store.fail(state.error ?? USER_SAFE_MESSAGES.capture_failed)
        }
      }),
    [],
  )

  // Refresh recovery: if the store thinks we are recording but the recorder
  // has no session (e.g. it was lost on reload), surface a failure.
  useEffect(() => {
    if (!hydrated) return
    const local = useCaptureStore.getState().session
    if (!isRecordingStatus(local.status)) return
    let cancelled = false
    services.capture
      .getState()
      .then((remote) => {
        if (cancelled) return
        if (!isRecordingStatus(remote.status)) {
          useCaptureStore.getState().fail(USER_SAFE_MESSAGES.capture_failed)
        } else if (remote.status !== local.status) {
          useCaptureStore.getState()[remote.status === "paused" ? "pause" : "resume"]()
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [hydrated])

  // Follow server-side processing once capture has stopped.
  const processing = useProcessingStatus(meetingId, {
    enabled: Boolean(meetingId) && isProcessingCaptureStatus(status),
  })
  const serverStatus = processing.data?.status
  const serverError = processing.data?.error?.message
  useEffect(() => {
    if (!serverStatus) return
    const store = useCaptureStore.getState()
    if (serverStatus === "failed") store.fail(serverError ?? USER_SAFE_MESSAGES.processing_failed)
    else store.advance(serverStatus === "ready" ? "complete" : serverStatus)
  }, [serverStatus, serverError])

  const start = useMutation({
    mutationFn: (input: StartCaptureInput) => services.capture.start(input),
    onSuccess: (state, input) => {
      const store = useCaptureStore.getState()
      // A finished (complete/failed) session must be cleared before a new one starts.
      if (store.session.status !== "idle" && store.session.status !== "ready") store.reset()
      useCaptureStore.getState().start({
        meetingId: state.meetingId,
        title: input.title,
        mode: input.mode,
        calendarEventId: input.calendarEventId,
      })
      invalidateMeetingDependents(queryClient, state.meetingId)
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    },
  })

  // Pause/resume apply locally first so the timer reacts instantly.
  const pause = useMutation({
    mutationFn: () => services.capture.pause(),
    onMutate: () => useCaptureStore.getState().pause(),
    onError: () => useCaptureStore.getState().resume(),
  })

  const resume = useMutation({
    mutationFn: () => services.capture.resume(),
    onMutate: () => useCaptureStore.getState().resume(),
    onError: () => useCaptureStore.getState().pause(),
  })

  const stop = useMutation({
    mutationFn: (): Promise<Meeting> => services.capture.stop(),
    onSuccess: (meeting) => {
      useCaptureStore.getState().stop(meeting.id)
      queryClient.setQueryData(queryKeys.meetings.detail(meeting.id), meeting)
      invalidateMeetingDependents(queryClient, meeting.id)
    },
  })

  const discard = useMutation({
    mutationFn: () => services.capture.discard(),
    onSuccess: () => {
      useCaptureStore.getState().reset()
      invalidateMeetingDependents(queryClient)
    },
  })

  return {
    hydrated,
    session,
    status,
    meetingId,
    error,
    processing: processing.data,
    /** idle -> ready: user opened the capture panel. */
    prepare: (input?: { title?: string; mode?: CaptureMode; calendarEventId?: string }) =>
      useCaptureStore.getState().prepare(input),
    start,
    pause,
    resume,
    stop,
    discard,
    /** Back to idle after complete/failed (or to cancel "ready"). */
    reset: () => useCaptureStore.getState().reset(),
    isBusy: start.isPending || stop.isPending || discard.isPending,
  }
}
