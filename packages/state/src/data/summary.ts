import type { DiagnosticsSummary } from '@ihsaanly/ui/types'
import type { Diagnostics } from './export'

export { formatCoordinates } from '@ihsaanly/ui/types'

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
