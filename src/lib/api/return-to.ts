const OAUTH_RESULT_PARAMS = ["integration", "result", "reason"] as const

/**
 * Same-origin relative path (with query) that the backend OAuth callback
 * redirects back to. Previous OAuth result params are dropped so a retry
 * never carries a stale `result`.
 */
export function buildReturnTo(href: string): string {
  const url = new URL(href, "http://localhost")
  for (const key of OAUTH_RESULT_PARAMS) url.searchParams.delete(key)
  return `${url.pathname}${url.search}`
}

export function currentReturnTo(): string {
  if (typeof window === "undefined") return "/"
  return buildReturnTo(window.location.href)
}
