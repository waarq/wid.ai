/*
 * Public Supabase configuration. Both values are public by design: the anon
 * (publishable) key only grants what Row Level Security allows. The
 * service-role key must never appear in this app, in any NEXT_PUBLIC_* var or
 * anywhere else in the frontend.
 *
 * Read literally so Next.js inlines the values at build time.
 */
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const

export function isSupabaseConfigured(): boolean {
  return supabaseConfig.url.length > 0 && supabaseConfig.anonKey.length > 0
}
