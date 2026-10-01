import { AppException } from "@/lib/utils/errors"
import type { AppErrorCode, AppErrorDetails, JsonValue } from "@/types"

import type { AdapterResponse } from "./types"

type JsonObject = { [key: string]: JsonValue }

function isJsonObject(value: JsonValue | null | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function codeForStatus(status: number): AppErrorCode {
  if (status === 400 || status === 422) return "validation_error"
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not_found"
  if (status === 408) return "timeout"
  if (status === 409 || status === 412) return "conflict"
  if (status === 429) return "rate_limited"
  if (status >= 500) return "server_error"
  return "unknown"
}

/**
 * Accepts the two common validation shapes:
 *   { errors: { field: ["msg"] } }  and  { fieldErrors: { field: "msg" | ["msg"] } }
 * Only string messages survive; anything else is dropped.
 */
function extractFieldErrors(data: JsonValue | null): Record<string, string[]> | undefined {
  if (!isJsonObject(data)) return undefined
  const source = isJsonObject(data.fieldErrors) ? data.fieldErrors : isJsonObject(data.errors) ? data.errors : null
  if (!source) return undefined

  const result: Record<string, string[]> = {}
  for (const [field, value] of Object.entries(source)) {
    const messages = (Array.isArray(value) ? value : [value]).filter(
      (message): message is string => typeof message === "string",
    )
    if (messages.length > 0) result[field] = messages
  }
  return Object.keys(result).length > 0 ? result : undefined
}

function parseRetryAfter(value: string | undefined): number | undefined {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, seconds)
  const date = Date.parse(value)
  return Number.isNaN(date) ? undefined : Math.max(0, Math.round((date - Date.now()) / 1000))
}

/**
 * Maps a non-2xx response to an AppException. The backend's own message is
 * deliberately discarded; only structured, user-addressable data is kept.
 */
export function httpErrorFromResponse(response: AdapterResponse, requestId: string): AppException {
  const code = codeForStatus(response.status)
  const details: AppErrorDetails = { status: response.status, requestId }

  const fieldErrors = code === "validation_error" ? extractFieldErrors(response.data) : undefined
  if (fieldErrors) details.fieldErrors = fieldErrors

  const retryAfterSeconds = parseRetryAfter(response.headers["retry-after"])
  if (retryAfterSeconds !== undefined) details.retryAfterSeconds = retryAfterSeconds

  return new AppException(code, { details })
}
