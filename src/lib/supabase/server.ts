import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import { supabaseConfig } from "./config"

/*
 * Server Supabase client for Route Handlers, Server Functions and Server
 * Components. Server-only (imports next/headers): import this file directly.
 *
 * `cookies()` is async in Next 16. Writing cookies only works in Route
 * Handlers and Server Functions; in a Server Component `setAll` throws, which
 * is caught and ignored because the proxy already refreshed the session for
 * this request.
 *
 * Create one client per request, never share it across requests.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  return createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Called from a Server Component: cookies are read-only there.
        }
      },
    },
  })
}
