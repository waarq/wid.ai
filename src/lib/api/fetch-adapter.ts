import { AppException } from "@/lib/utils/errors"
import type { JsonValue } from "@/types"

import type { AdapterRequest, AdapterResponse, ApiAdapter, RequestBody } from "./types"

interface FetchAdapterOptions {
  /**
   * "include" sends the backend's httpOnly session cookie cross-origin.
   * Use "same-origin" when the API is served from the app's origin.
   */
  credentials?: RequestCredentials
}

function isBinaryBody(body: RequestBody): body is FormData | Blob {
  return (
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof Blob !== "undefined" && body instanceof Blob)
  )
}

function encodeBody(
  body: RequestBody | undefined,
  headers: Record<string, string>,
): BodyInit | undefined {
  if (body === undefined) return undefined
  // Let the runtime set multipart boundaries / blob types.
  if (isBinaryBody(body)) return body
  headers["content-type"] ??= "application/json"
  return JSON.stringify(body)
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value
  })
  return record
}

async function readJson(response: Response): Promise<JsonValue | null> {
  if (response.status === 204 || response.status === 205) return null
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("json")) return null
  const text = await response.text()
  if (text.length === 0) return null
  // JSON.parse returns `any`; annotating as JsonValue is exact for valid JSON.
  const parsed: JsonValue = JSON.parse(text)
  return parsed
}

export function createFetchAdapter(options: FetchAdapterOptions = {}): ApiAdapter {
  const credentials = options.credentials ?? "include"

  return {
    async send(request: AdapterRequest): Promise<AdapterResponse> {
      const headers = { ...request.headers }
      const body = encodeBody(request.body, headers)
      const response = await fetch(request.url, {
        method: request.method,
        headers,
        body,
        signal: request.signal,
        credentials,
      })

      let data: JsonValue | null
      try {
        data = await readJson(response)
      } catch (error) {
        // A body that claims to be JSON but isn't is a server fault.
        throw new AppException("server_error", { cause: error, details: { status: response.status } })
      }

      return { status: response.status, headers: headersToRecord(response.headers), data }
    },
  }
}
