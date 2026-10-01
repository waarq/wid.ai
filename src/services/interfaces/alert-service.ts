import type { Alert, AlertListParams, ListResponse } from "@/types"

/** Backs both the /alerts page and the topbar notification menu. */
export interface AlertService {
  list(params?: AlertListParams): Promise<ListResponse<Alert>>
  /** Drives the notification badge. */
  getUnreadCount(): Promise<number>
  markRead(id: string): Promise<Alert>
  markAllRead(): Promise<void>
  dismiss(id: string): Promise<void>
}
