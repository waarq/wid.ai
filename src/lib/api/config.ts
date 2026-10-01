/**
 * Public API configuration.
 *
 * NEXT_PUBLIC_* values are inlined at build time and only when accessed
 * literally (process.env.NEXT_PUBLIC_X). Never read them dynamically, and
 * never put secrets in them.
 */

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

export const apiConfig = {
  baseUrl: trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || "/api"),
  timeoutMs: 15_000,
} as const
