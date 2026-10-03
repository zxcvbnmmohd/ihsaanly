// The web-only half of building and offering an export/diagnostics bundle:
// there is no device API or reminder permission to ask (capabilities.reminders
// is off on web), so this only names what platform=web means and hands the
// JSON to a download instead of the native share sheet. Everything pure — the
// JSON shape itself — lives in @ihsaanly/state/data/export, shared with the
// mobile app so a file exported here imports on the phone, and vice versa.
import {
  buildDiagnostics as buildDiagnosticsBase,
  buildExport,
  type Diagnostics,
  type DiagnosticsApp,
  type DiagnosticsReminders,
} from '@ihsaanly/state/data/export'
import { downloadFile } from '~/platform/download'

export type { Diagnostics }
export { buildExport }

/** This app and browser, as every diagnostic report (downloaded or attached to feedback) names them. */
export function diagnosticsApp(): DiagnosticsApp {
  return { version: '1.0.0', platform: 'web', osVersion: navigator.userAgent, device: 'Browser' }
}

/** Reminders need the phone app: there is nothing queued and no permission to report on. */
export const DIAGNOSTICS_REMINDERS: DiagnosticsReminders = {
  permission: 'unavailable',
  pending: [],
}

export function buildDiagnostics(): Diagnostics {
  return buildDiagnosticsBase(diagnosticsApp(), DIAGNOSTICS_REMINDERS)
}

export function downloadExport(): void {
  downloadFile('ihsaanly-data.json', JSON.stringify(buildExport(), null, 2))
}

export function downloadDiagnostics(diagnostics: Diagnostics): void {
  downloadFile('ihsaanly-diagnostics.json', JSON.stringify(diagnostics, null, 2))
}
