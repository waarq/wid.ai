/**
 * Normalized frontend error contract. UI code depends on this shape only,
 * never on backend-specific error formats.
 */

export const APP_ERROR_CODES = [
  // Transport
  "network_error",
  "timeout",
  "cancelled",
  // HTTP semantics
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "validation_error",
  "rate_limited",
  "server_error",
  // Domain
  "calendar_connection_failed",
  "integration_connection_failed",
  "capture_failed",
  "processing_failed",
  "service_unavailable",
  // Fallback
  "unknown",
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]

export interface AppErrorDetails {
  /** HTTP status when the error originated from a response. */
  status?: number
  /** Correlates a failure with backend logs. Safe to show in a "copy details" affordance. */
  requestId?: string
  /** Per-field validation messages, keyed by input name. */
  fieldErrors?: Record<string, string[]>
  /** Seconds to wait before retrying (from Retry-After). */
  retryAfterSeconds?: number
}

export interface AppError {
  code: AppErrorCode
  /** Always user-safe. Never a raw backend message. */
  message: string
  /** Whether repeating the same request may succeed. */
  retryable: boolean
  details?: AppErrorDetails
}
