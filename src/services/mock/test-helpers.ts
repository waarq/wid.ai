import { expect } from "vitest"

import { setSessionHintCookie } from "@/lib/auth/client-session"
import { AppException } from "@/lib/utils/errors"
import type { AppErrorCode, Traceable } from "@/types"

import { mockControls } from "./controls"
import { getMockDb, type MockDb } from "./db"

/*
 * Shared setup for mock service tests (imported only by *.test.ts files).
 * Vitest isolates modules per test file, so each file gets its own MockDb.
 */

/** Signs in as the onboarded demo user and restores seed data. */
export async function resetMockWorld(): Promise<MockDb> {
  setSessionHintCookie("ready")
  await mockControls.reset()
  return getMockDb()
}

/** Asserts the promise rejects with an AppException of the given code, and returns it. */
export async function expectAppError(promise: Promise<unknown>, code: AppErrorCode): Promise<AppException> {
  const error = await promise.then(
    () => {
      throw new Error(`expected rejection with "${code}", but it resolved`)
    },
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(AppException)
  expect((error as AppException).code).toBe(code)
  return error as AppException
}

/** Asserts a traceable insight points at a real segment with a matching start time. */
export function expectTraceable(db: MockDb, insight: Traceable, label = ""): void {
  expect(insight.meetingId, label).toBeTruthy()
  expect(insight.sourceSegmentId, label).toBeTruthy()
  const segment = db.state.transcripts[insight.meetingId]?.segments.find((s) => s.id === insight.sourceSegmentId)
  expect(segment, `${label} -> ${insight.sourceSegmentId}`).toBeDefined()
  expect(insight.sourceTimestamp, label).toBe(segment!.startTime)
}
