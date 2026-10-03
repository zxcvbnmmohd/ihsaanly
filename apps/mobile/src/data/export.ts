// The native-only half of building and sending an export/diagnostics bundle:
// device identity (expo-device, expo-constants), the reminder permission and
// queue (expo-notifications, via @/notifications/schedule), and handing the
// file to the share sheet (expo-file-system, expo-sharing). Everything pure —
// the JSON shape itself — lives in @ihsaanly/state/data/export, shared with
// the web companion so a file exported here imports on the web, and vice versa.
import {
  buildDiagnostics as buildDiagnosticsBase,
  buildExport,
  type Diagnostics,
  type DiagnosticsApp,
  type DiagnosticsReminders,
} from '@ihsaanly/state/data/export'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { pendingReminders, permissionStatus } from '@/notifications/schedule'

export type { Diagnostics }
export { buildExport }

/** This app and device, as every diagnostic report (shared or attached to feedback) names them. */
export function diagnosticsApp(): DiagnosticsApp {
  return {
    version: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    device: `${Device.manufacturer ?? '?'} ${Device.modelName ?? '?'}`,
  }
}

/** The reminder permission and queue, which only the OS can answer (asynchronously). */
export async function diagnosticsReminders(): Promise<DiagnosticsReminders> {
  return { permission: await permissionStatus(), pending: await pendingReminders() }
}

export async function buildDiagnostics(): Promise<Diagnostics> {
  return buildDiagnosticsBase(diagnosticsApp(), await diagnosticsReminders())
}

/**
 * The file carries coordinates and the whole practice record, so it does not
 * outlive the share sheet. The cache is not private to the user in any useful
 * sense, and the sheet has already copied whatever the recipient keeps.
 */
async function share(name: string, contents: unknown): Promise<boolean> {
  const file = new File(Paths.cache, name)
  // `write` is a promise. Not awaiting it handed the share sheet a file that
  // might still be empty.
  await file.write(JSON.stringify(contents, null, 2))

  try {
    if (!(await Sharing.isAvailableAsync())) return false

    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' })
    return true
  } finally {
    try {
      file.delete()
    } catch {
      // A cache file that outlives the share is untidy, not harmful.
    }
  }
}

export function shareExport(): Promise<boolean> {
  return share('ihsaanly-data.json', buildExport())
}

/** Takes the bundle the preview screen displayed, so the two can never drift. */
export function shareDiagnostics(diagnostics: Diagnostics): Promise<boolean> {
  return share('ihsaanly-diagnostics.json', diagnostics)
}
