import type { JsonPrimitive, JsonValue } from "@/types"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type QueryPrimitive = string | number | boolean
/** null/undefined values are dropped; arrays become repeated keys (?status=a&status=b). */
export type QueryParams = Record<string, QueryPrimitive | readonly QueryPrimitive[] | null | undefined>

/**
 * Anything the client can send. Plain objects/arrays are JSON-encoded;
 * FormData and Blob are sent as-is (uploads).
 */
export type RequestBody = object | JsonPrimitive

/** Validates/narrows a response body at the boundary (e.g. a zod schema's `parse`). */
export type ResponseParser<T> = (data: JsonValue | null) => T

export interface RequestOptions<T> {
  query?: QueryParams
  headers?: Record<string, string>
  /** Caller cancellation (TanStack Query passes one to every queryFn). */
  signal?: AbortSignal
  /** Overrides the client default. */
  timeoutMs?: number
  parse?: ResponseParser<T>
}

/** What the client hands to an adapter. Fully resolved: URL, headers and signal are final. */
export interface AdapterRequest {
  method: HttpMethod
  url: string
  /** Path relative to the base URL, for adapters that route on it (mocks). */
  path: string
  query: QueryParams
  /** Lower-cased header names. */
  headers: Record<string, string>
  body?: RequestBody
  signal: AbortSignal
}

export interface AdapterResponse {
  status: number
  /** Lower-cased header names. */
  headers: Record<string, string>
  /** Parsed JSON body, or null when the response had no JSON body. */
  data: JsonValue | null
}

/**
 * Transport seam. The default adapter uses fetch; a mock adapter can be
 * dropped in to serve canned responses without touching services.
 * HTTP error statuses resolve normally; the client maps them to AppError.
 * Adapters reject only for transport failures (any rejection that is not
 * already an AppError is treated as a network error).
 */
export interface ApiAdapter {
  send(request: AdapterRequest): Promise<AdapterResponse>
}

/** Supplies a bearer token when the backend uses header auth. Never read from localStorage. */
export type AuthTokenProvider = () => string | null | Promise<string | null>

export interface ApiClientConfig {
  baseUrl: string
  adapter: ApiAdapter
  timeoutMs: number
  defaultHeaders?: Record<string, string>
  getAuthToken?: AuthTokenProvider
}

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions<T>): Promise<T>
  post<T>(path: string, body?: RequestBody, options?: RequestOptions<T>): Promise<T>
  put<T>(path: string, body?: RequestBody, options?: RequestOptions<T>): Promise<T>
  patch<T>(path: string, body?: RequestBody, options?: RequestOptions<T>): Promise<T>
  delete<T = void>(path: string, options?: RequestOptions<T>): Promise<T>
  request<T>(method: HttpMethod, path: string, body?: RequestBody, options?: RequestOptions<T>): Promise<T>
}
