import { APP_ERROR_CODES, type AppError, type AppErrorCode, type AppErrorDetails } from "@/types"

/**
 * User-safe default copy per error code. Screens add their own context
 * ("We couldn't load your meetings.") and use these as the explanation.
 * Raw backend messages are never shown.
 */
export const USER_SAFE_MESSAGES: Record<AppErrorCode, string> = {
  network_error: "We couldn't reach WIT. Check your connection and try again.",
  timeout: "This is taking longer than expected. Please try again.",
  cancelled: "The request was cancelled.",
  unauthorized: "Your session has ended. Please sign in again.",
  forbidden: "You don't have access to this.",
  not_found: "We couldn't find what you were looking for.",
  conflict: "This was changed somewhere else. Refresh and try again.",
  validation_error: "Some details need your attention.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
  server_error: "Something went wrong on our side. Please try again.",
  calendar_connection_failed: "Google Calendar couldn't be connected. Your meetings haven't been changed.",
  integration_connection_failed: "The integration couldn't be connected. Please try again.",
  capture_failed: "Capture stopped unexpectedly. Anything recorded so far has been kept.",
  processing_failed: "We couldn't finish processing this meeting.",
  service_unavailable: "This feature isn't available right now.",
  unknown: "Something went wrong. Please try again.",
}

const RETRYABLE_CODES: ReadonlySet<AppErrorCode> = new Set<AppErrorCode>([
  "network_error",
  "timeout",
  "rate_limited",
  "server_error",
])

const APP_ERROR_CODE_SET: ReadonlySet<string> = new Set<string>(APP_ERROR_CODES)

export function isAppErrorCode(value: string): value is AppErrorCode {
  return APP_ERROR_CODE_SET.has(value)
}

interface AppExceptionOptions {
  /** Developer-authored, user-safe copy. Defaults to USER_SAFE_MESSAGES[code]. */
  message?: string
  details?: AppErrorDetails
  retryable?: boolean
  /** Original error, kept for debugging. Never rendered. */
  cause?: unknown
}

/**
 * Throwable AppError. Services and the API client only ever reject with this,
 * so TanStack Query's `error` is always an AppError.
 */
export class AppException extends Error implements AppError {
  readonly code: AppErrorCode
  readonly retryable: boolean
  readonly details?: AppErrorDetails

  constructor(code: AppErrorCode, options: AppExceptionOptions = {}) {
    super(options.message ?? USER_SAFE_MESSAGES[code], { cause: options.cause })
    this.name = "AppException"
    this.code = code
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code)
    if (options.details) this.details = options.details
  }

  toJSON(): AppError {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}

export function createAppError(code: AppErrorCode, options?: AppExceptionOptions): AppException {
  return new AppException(code, options)
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== "object" || value === null) return false
  if (!("code" in value) || !("message" in value) || !("retryable" in value)) return false
  return (
    typeof value.code === "string" &&
    isAppErrorCode(value.code) &&
    typeof value.message === "string" &&
    typeof value.retryable === "boolean"
  )
}

function isAbortLike(error: unknown, name: "AbortError" | "TimeoutError"): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === name
}

/**
 * Normalises anything thrown into an AppError. Unknown errors keep their
 * original value as `cause` but never leak their message to the UI.
 */
export function toAppError(error: unknown, fallbackCode: AppErrorCode = "unknown"): AppError {
  if (isAppError(error)) return error
  if (isAbortLike(error, "TimeoutError")) return new AppException("timeout", { cause: error })
  if (isAbortLike(error, "AbortError")) return new AppException("cancelled", { cause: error })
  return new AppException(fallbackCode, { cause: error })
}

export function isRetryableError(error: unknown): boolean {
  return isAppError(error) ? error.retryable : false
}

export function getUserMessage(error: unknown): string {
  return toAppError(error).message
}

/** Field-level messages for wiring backend validation into React Hook Form. */
export function getFieldErrors(error: unknown): Record<string, string[]> {
  return isAppError(error) ? (error.details?.fieldErrors ?? {}) : {}
}
