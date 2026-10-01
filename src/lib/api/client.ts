import { AppException, isAppError } from "@/lib/utils/errors"

import { apiConfig } from "./config"
import { createFetchAdapter } from "./fetch-adapter"
import { httpErrorFromResponse } from "./http-errors"
import type {
  ApiClient,
  ApiClientConfig,
  AuthTokenProvider,
  HttpMethod,
  QueryParams,
  RequestBody,
  RequestOptions,
} from "./types"

const REQUEST_ID_HEADER = "x-request-id"

export function createRequestId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID()
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function buildQueryString(query: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) search.append(key, String(item))
  }
  const encoded = search.toString()
  return encoded ? `?${encoded}` : ""
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`
}

function lowerCaseKeys(headers: Record<string, string> | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  if (!headers) return result
  for (const [key, value] of Object.entries(headers)) result[key.toLowerCase()] = value
  return result
}

/**
 * Links the caller's signal with a timeout. Implemented by hand because
 * AbortSignal.any is newer than the Safari 16.4 baseline Next.js 16 supports.
 */
function createLinkedSignal(timeoutMs: number, callerSignal: AbortSignal | undefined) {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const onCallerAbort = () => controller.abort()
  if (callerSignal?.aborted) controller.abort()
  else callerSignal?.addEventListener("abort", onCallerAbort, { once: true })

  return {
    signal: controller.signal,
    didTimeOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer)
      callerSignal?.removeEventListener("abort", onCallerAbort)
    },
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: RequestBody,
    options: RequestOptions<T> = {},
  ): Promise<T> {
    const requestId = createRequestId()
    const headers: Record<string, string> = {
      accept: "application/json",
      ...lowerCaseKeys(config.defaultHeaders),
      ...lowerCaseKeys(options.headers),
      [REQUEST_ID_HEADER]: requestId,
    }

    const token = config.getAuthToken ? await config.getAuthToken() : null
    if (token) headers.authorization = `Bearer ${token}`

    const query = options.query ?? {}
    const url = joinUrl(config.baseUrl, path) + buildQueryString(query)
    const linked = createLinkedSignal(options.timeoutMs ?? config.timeoutMs, options.signal)

    let response
    try {
      response = await config.adapter.send({
        method,
        url,
        path,
        query,
        headers,
        body,
        signal: linked.signal,
      })
    } catch (error) {
      if (isAppError(error)) throw error
      if (linked.didTimeOut()) throw new AppException("timeout", { cause: error, details: { requestId } })
      if (options.signal?.aborted) throw new AppException("cancelled", { cause: error, details: { requestId } })
      throw new AppException("network_error", { cause: error, details: { requestId } })
    } finally {
      linked.cleanup()
    }

    const resolvedRequestId = response.headers[REQUEST_ID_HEADER] ?? requestId
    if (response.status < 200 || response.status >= 300) {
      throw httpErrorFromResponse(response, resolvedRequestId)
    }

    if (options.parse) {
      try {
        return options.parse(response.data)
      } catch (error) {
        // Response did not match the contract.
        throw new AppException("server_error", {
          cause: error,
          details: { status: response.status, requestId: resolvedRequestId },
        })
      }
    }

    // Without a parser the typed service contract is trusted as-is.
    return response.data as T
  }

  return {
    request,
    get: (path, options) => request("GET", path, undefined, options),
    post: (path, body, options) => request("POST", path, body, options),
    put: (path, body, options) => request("PUT", path, body, options),
    patch: (path, body, options) => request("PATCH", path, body, options),
    delete: (path, options) => request("DELETE", path, undefined, options),
  }
}

let authTokenProvider: AuthTokenProvider | null = null

/**
 * Registers a bearer-token source for header-based auth. Cookie-based
 * sessions need nothing: the fetch adapter sends credentials by default.
 * Tokens must come from memory or the auth SDK, never from localStorage.
 */
export function setAuthTokenProvider(provider: AuthTokenProvider | null): void {
  authTokenProvider = provider
}

/** Shared client used by every Api*Service. */
export const apiClient: ApiClient = createApiClient({
  baseUrl: apiConfig.baseUrl,
  timeoutMs: apiConfig.timeoutMs,
  adapter: createFetchAdapter(),
  getAuthToken: () => (authTokenProvider ? authTokenProvider() : null),
})
