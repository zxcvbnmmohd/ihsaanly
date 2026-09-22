import type { Diagnostics } from './export'

/**
 * What the preview screen shows before a diagnostic report is sent. Derived
 * rather than stored, and kept pure so a test can pin exactly what a person is
 * told is about to leave their device.
 */
export interface DiagnosticsSummary {
  version: string
  device: string
  coordinates: { latitude: number; longitude: number } | null
  records: number
  settings: number
  /** Reminder permission, and how many are queued. */
  reminders: { permission: string; pending: number }
  /** How many recorded failures ride along, and when the last one was. */
  failures: { count: number; latest: string | null }
  hasError: boolean
}

export function summarise(diagnostics: Diagnostics): DiagnosticsSummary {
  return {
    version: diagnostics.app.version,
    device: `${diagnostics.app.device} · ${diagnostics.app.platform} ${diagnostics.app.osVersion}`,
    coordinates: diagnostics.coordinates,
    records: diagnostics.data.events.length,
    settings: Object.keys(diagnostics.data.preferences).length,
    reminders: {
      permission: diagnostics.reminders.permission,
      pending: diagnostics.reminders.pending.length,
    },
    failures: {
      count: diagnostics.failures.length,
      latest: diagnostics.failures.at(-1)?.at ?? null,
    },
    hasError: diagnostics.lastStorageError !== null,
  }
}

/** Shows exactly what the bundle carries; the rounding happened when it was built. */
export function formatCoordinates(at: { latitude: number; longitude: number }): string {
  return `${at.latitude}, ${at.longitude}`
}
