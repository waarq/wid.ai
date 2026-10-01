import { AppException } from "@/lib/utils/errors"

import { mockControls } from "./controls"
import { getMockDb, type MockDb } from "./db"
import { clone, sleep } from "./utils"

/*
 * Every mock method runs through `mockCall`:
 *   1. simulated latency (120-400ms by default, 0 in tests; see controls.ts)
 *   2. failure injection for the operation name
 *   3. the operation itself against the shared in-memory MockDb
 *   4. a deep clone of the result, so callers never hold live references
 *   5. normalisation: anything that is not an AppException becomes one
 *
 * Writes also schedule a snapshot of the database to sessionStorage, so a
 * page refresh keeps the demo state (captured meetings, toggled actions, ...).
 */

export interface MockCallOptions {
  /** Persist a snapshot after the operation. */
  write?: boolean
  /** Skip simulated latency (internal calls, subscriptions). */
  instant?: boolean
}

export async function mockCall<T>(
  op: string,
  run: (db: MockDb) => T | Promise<T>,
  options: MockCallOptions = {},
): Promise<T> {
  try {
    const [db] = await Promise.all([getMockDb(), options.instant ? null : sleep(mockControls.nextLatencyMs())])
    mockControls.throwIfFailing(op)
    const result = await run(db)
    if (options.write) db.save()
    return clone(result)
  } catch (error) {
    if (error instanceof AppException) throw error
    throw new AppException("unknown", { cause: error })
  }
}

export function mockWrite<T>(op: string, run: (db: MockDb) => T | Promise<T>): Promise<T> {
  return mockCall(op, run, { write: true })
}
