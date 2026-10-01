import { INTEGRATION_PROVIDERS, type IntegrationProvider } from "@/types"

/*
 * The backend OAuth callback redirects to APP_URL + returnTo with
 *   ?integration=<provider>&result=connected
 *   ?integration=<provider>&result=error&reason=<code>
 */

export type OAuthReturn =
  | { provider: IntegrationProvider; result: "connected" }
  | { provider: IntegrationProvider; result: "error"; reason: string | null }

const PROVIDER_LABEL: Partial<Record<IntegrationProvider, string>> = {
  google_calendar: "Google Calendar",
  zoom: "Zoom",
}

export function oauthProviderLabel(provider: IntegrationProvider): string {
  return PROVIDER_LABEL[provider] ?? provider
}

/** Parses a location search string. Returns null unless both params are valid. */
export function parseOAuthReturn(search: string): OAuthReturn | null {
  const params = new URLSearchParams(search)
  const provider = params.get("integration")
  const result = params.get("result")
  if (!provider || !(INTEGRATION_PROVIDERS as readonly string[]).includes(provider)) return null
  if (result === "connected") return { provider: provider as IntegrationProvider, result }
  if (result === "error") {
    const reason = params.get("reason")
    return { provider: provider as IntegrationProvider, result, reason: reason ? reason.slice(0, 64) : null }
  }
  return null
}

/** `pathname + search + hash` with the OAuth result params removed. */
export function stripOAuthReturn(pathname: string, search: string, hash = ""): string {
  const params = new URLSearchParams(search)
  params.delete("integration")
  params.delete("result")
  params.delete("reason")
  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ""}${hash}`
}

/** User-safe copy. The raw reason code is never shown. */
export function oauthErrorMessage(reason: string | null): string {
  if (reason === "access_denied" || reason === "denied") return "Access was not granted, so nothing was connected."
  return "The connection didn't finish. Nothing was changed. You can try again."
}
