import { AppException } from "@/lib/utils/errors"
import { APP_ERROR_CODES, type AppErrorCode } from "@/types"

/*
 * Mock controls: latency and failure injection for demos, error-state QA and
 * scripts. Mock mode only; the Api* services ignore all of this.
 *
 * Three ways to drive it:
 *
 * 1. URL flags (read on every call, so they work on any page):
 *      ?mockFail=meetings.list                    fail with server_error
 *      ?mockFail=meetings.list:not_found          fail with a specific code
 *      ?mockFail=alerts.*:network_error,deals.getById
 *      ?mockFail=*                                fail everything
 *      ?mockLatency=0 | slow | 800 | 300-900      override latency (ms)
 *      ?mockProcessing=fail                       next capture fails processing
 *
 * 2. Browser console (mock mode): `window.__WID_MOCK__`
 *      __WID_MOCK__.fail("meetings.list", "server_error")
 *      __WID_MOCK__.fail("assistant.ask", "timeout", { times: 1 })
 *      __WID_MOCK__.clearFailures()
 *      __WID_MOCK__.setLatency(0)            // or setLatency(1500, 3000)
 *      __WID_MOCK__.failNextProcessing()
 *      __WID_MOCK__.failActiveCapture()      // recorder dies mid-capture
 *      __WID_MOCK__.setProcessingPhaseMs(500)
 *      await __WID_MOCK__.reset()            // back to seed data, keeps session
 *
 * 3. Code (scripts/tests only; UI never imports services/mock):
 *      import { mockControls } from "@/services/mock"
 *
 * Operation names are `<registryKey>.<method>`, e.g. "meetings.list",
 * "actionItems.toggleComplete", "integrations.connect". A trailing ".*"
 * matches a whole service and "*" matches every call.
 */

export interface FailureRule {
  code: AppErrorCode
  /** Remaining failures; undefined means "until cleared". */
  remaining?: number
  message?: string
}

const DEFAULT_LATENCY = { minMs: 120, maxMs: 400 } as const
const SLOW_LATENCY = { minMs: 1500, maxMs: 3000 } as const
/** Each of processing -> transcribing -> understanding lasts this long by default. */
const DEFAULT_PROCESSING_PHASE_MS = 2500

function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test"
}

function readUrlFlag(name: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return new URLSearchParams(window.location.search).get(name)
  } catch {
    return null
  }
}

function toErrorCode(value: string | undefined): AppErrorCode {
  return value && (APP_ERROR_CODES as readonly string[]).includes(value) ? (value as AppErrorCode) : "server_error"
}

function matches(pattern: string, op: string): boolean {
  if (pattern === "*" || pattern === op) return true
  if (pattern.endsWith(".*")) return op.startsWith(pattern.slice(0, -1))
  return false
}

type ResetHandler = () => Promise<void> | void

class MockControls {
  private latency: { minMs: number; maxMs: number } = isTestEnv() ? { minMs: 0, maxMs: 0 } : { ...DEFAULT_LATENCY }
  private readonly failures = new Map<string, FailureRule>()
  private processingPhaseMs = DEFAULT_PROCESSING_PHASE_MS
  private processingFailurePending = false
  private resetHandler: ResetHandler | null = null
  private captureFailureHandler: (() => void) | null = null

  /** setLatency(0) disables delay; setLatency(min, max) picks uniformly in range. */
  setLatency(minMs: number, maxMs: number = minMs): void {
    const min = Math.max(0, minMs)
    this.latency = { minMs: min, maxMs: Math.max(min, maxMs) }
  }

  getLatency(): { minMs: number; maxMs: number } {
    return { ...this.latency }
  }

  /** Next simulated delay, honouring ?mockLatency=. */
  nextLatencyMs(): number {
    const { minMs, maxMs } = this.resolveLatency()
    return maxMs <= minMs ? minMs : Math.round(minMs + Math.random() * (maxMs - minMs))
  }

  private resolveLatency(): { minMs: number; maxMs: number } {
    const flag = readUrlFlag("mockLatency")
    if (flag === null) return this.latency
    if (flag === "slow") return SLOW_LATENCY
    const [min, max] = flag.split("-").map(Number)
    if (!Number.isFinite(min)) return this.latency
    return { minMs: Math.max(0, min), maxMs: Number.isFinite(max) ? Math.max(min, max) : min }
  }

  /** Inject a failure for an operation (or "service.*", or "*"). */
  fail(op: string, code: AppErrorCode = "server_error", options: { times?: number; message?: string } = {}): void {
    this.failures.set(op, { code, remaining: options.times, message: options.message })
  }

  clearFailures(op?: string): void {
    if (op) this.failures.delete(op)
    else this.failures.clear()
  }

  listFailures(): Array<{ op: string } & FailureRule> {
    return Array.from(this.failures, ([op, rule]) => ({ op, ...rule }))
  }

  /** Throws the injected AppException for `op`, if any rule matches. */
  throwIfFailing(op: string): void {
    const fromUrl = readUrlFlag("mockFail")
    if (fromUrl) {
      for (const entry of fromUrl.split(",")) {
        const [pattern, code] = entry.trim().split(":")
        if (pattern && matches(pattern, op)) {
          throw new AppException(toErrorCode(code), { cause: new Error(`mockFail flag: ${op}`) })
        }
      }
    }
    for (const [pattern, rule] of this.failures) {
      if (!matches(pattern, op)) continue
      if (rule.remaining !== undefined) {
        rule.remaining -= 1
        if (rule.remaining <= 0) this.failures.delete(pattern)
      }
      throw new AppException(rule.code, {
        message: rule.message,
        cause: new Error(`mockControls.fail: ${op}`),
      })
    }
  }

  /** Length of each processing phase for newly stopped captures. */
  setProcessingPhaseMs(ms: number): void {
    this.processingPhaseMs = Math.max(0, ms)
  }

  getProcessingPhaseMs(): number {
    return this.processingPhaseMs
  }

  /** The next capture to stop will fail during transcription. */
  failNextProcessing(): void {
    this.processingFailurePending = true
  }

  /** Consumed by MockMeetingService.stopCapture. */
  consumeProcessingFailure(): boolean {
    if (readUrlFlag("mockProcessing") === "fail") return true
    const pending = this.processingFailurePending
    this.processingFailurePending = false
    return pending
  }

  /** Simulates the recorder dying mid-capture (device lost, permission revoked). */
  failActiveCapture(): void {
    this.captureFailureHandler?.()
  }

  /** @internal Registered by MockCaptureService. */
  onCaptureFailure(handler: () => void): void {
    this.captureFailureHandler = handler
  }

  /** @internal Registered by the mock database. */
  onReset(handler: ResetHandler): void {
    this.resetHandler = handler
  }

  /** Restores seed data and default controls. The sign-in hint cookie is untouched. */
  async reset(): Promise<void> {
    this.failures.clear()
    this.latency = isTestEnv() ? { minMs: 0, maxMs: 0 } : { ...DEFAULT_LATENCY }
    this.processingPhaseMs = DEFAULT_PROCESSING_PHASE_MS
    this.processingFailurePending = false
    await this.resetHandler?.()
  }
}

export type { MockControls }

export const mockControls = new MockControls()

declare global {
  interface Window {
    /**
     * Mock-mode demo controls. See src/services/mock/controls.ts. Installed
     * when the mock database first loads, so API mode never exposes it.
     */
    __WID_MOCK__?: MockControls
  }
}
