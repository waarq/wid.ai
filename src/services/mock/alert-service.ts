import { AppException } from "@/lib/utils/errors"
import type { AlertService } from "@/services/interfaces"
import { ALERT_FILTERS, type Alert, type AlertFilter, type AlertListParams, type ListResponse } from "@/types"

import { mockCall, mockWrite } from "./runtime"
import { nowIso, paginate } from "./utils"

const FILTER: Record<AlertFilter, (alert: Alert) => boolean> = {
  all: () => true,
  unread: (a) => a.readAt === null,
  actions: (a) => a.type === "action_due",
  mentions: (a) => a.type === "mention",
  decisions: (a) => a.type === "decision_changed",
}

export class MockAlertService implements AlertService {
  list(params: AlertListParams = {}): Promise<ListResponse<Alert>> {
    return mockCall("alerts.list", (db) => {
      const filter = params.filter ?? "all"
      if (!(ALERT_FILTERS as readonly string[]).includes(filter)) {
        throw new AppException("validation_error", { details: { fieldErrors: { filter: ["Unknown filter."] } } })
      }
      // Refresh processing first so "Meeting ready" alerts appear on time.
      db.accessibleMeetings()
      const items = db.state.alerts
        .filter(FILTER[filter])
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      return paginate(items, params)
    })
  }

  getUnreadCount(): Promise<number> {
    return mockCall("alerts.getUnreadCount", (db) => {
      db.accessibleMeetings()
      return db.state.alerts.filter((a) => a.readAt === null).length
    })
  }

  markRead(id: string): Promise<Alert> {
    return mockWrite("alerts.markRead", (db) => {
      const alert = db.state.alerts.find((a) => a.id === id)
      if (!alert) throw new AppException("not_found", { cause: new Error(`alert ${id}`) })
      alert.readAt ??= nowIso()
      return alert
    })
  }

  markAllRead(): Promise<void> {
    return mockWrite("alerts.markAllRead", (db) => {
      const now = nowIso()
      for (const alert of db.state.alerts) alert.readAt ??= now
    })
  }

  dismiss(id: string): Promise<void> {
    return mockWrite("alerts.dismiss", (db) => {
      const before = db.state.alerts.length
      db.state.alerts = db.state.alerts.filter((a) => a.id !== id)
      if (db.state.alerts.length === before) throw new AppException("not_found", { cause: new Error(`alert ${id}`) })
    })
  }
}
