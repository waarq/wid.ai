import type { Settings, UpdateSettingsInput } from "@/types"

export interface SettingsService {
  get(): Promise<Settings>
  /** Patches one section and returns the full, updated settings. */
  update(input: UpdateSettingsInput): Promise<Settings>
  /** Signs out one other device listed under Security. */
  revokeSession(sessionId: string): Promise<Settings>
}
