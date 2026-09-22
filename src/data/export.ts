import * as Device from 'expo-device'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

import { getNotificationPreferences } from '@/notifications/store'
import { getPlace } from '@/location/store'
import type { NotificationPreferences } from '@/plan/notification-preferences'
import { allActions, allPreferences, lastStorageError } from '@/storage/events'
import { deviceLocaleTags } from '@/i18n/device'

import { EXPORT_VERSION, type ExportedData } from './bundle'

function toExportedEvents(): ExportedData['events'] {
  return allActions().map((action) => ({
    kind: action.kind,
    subject: action.subject,
    at: action.at,
    logDay: action.logDay,
    deltaSeconds: action.deltaSeconds,
  }))
}

export function buildExport(): ExportedData {
  return {
    format: 'ihsaanly-export',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    preferences: allPreferences(),
    events: toExportedEvents(),
  }
}

/**
 * Everything needed to replay what the user saw. Coordinates are in here, and
 * so is their practice — which is why nothing leaves without them choosing it,
 * and why the preview screen shows them what it contains first.
 */
export interface Diagnostics {
  format: 'ihsaanly-diagnostics'
  generatedAt: string
  app: { version: string; platform: string; osVersion: string; device: string }
  locale: string
  timeZone: string
  coordinates: { latitude: number; longitude: number } | null
  notifications: NotificationPreferences
  lastStorageError: string | null
  data: ExportedData
}

/**
 * Three decimals is a little over a hundred metres. Prayer windows move by
 * minutes over kilometres, so this still reproduces any bug worth reporting,
 * and it makes "approximate coordinates" true of what actually gets sent.
 */
function approximate(place: { latitude: number; longitude: number }): {
  latitude: number
  longitude: number
} {
  const round = (value: number): number => Math.round(value * 1000) / 1000
  return { latitude: round(place.latitude), longitude: round(place.longitude) }
}

export function buildDiagnostics(): Diagnostics {
  const place = getPlace()

  return {
    format: 'ihsaanly-diagnostics',
    generatedAt: new Date().toISOString(),
    app: {
      version: Constants.expoConfig?.version ?? 'unknown',
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      device: `${Device.manufacturer ?? '?'} ${Device.modelName ?? '?'}`,
    },
    locale: deviceLocaleTags()[0] ?? 'unknown',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    coordinates: place ? approximate(place) : null,
    notifications: getNotificationPreferences(),
    lastStorageError: lastStorageError(),
    data: buildExport(),
  }
}

/**
 * The file carries coordinates and the whole practice record, so it does not
 * outlive the share sheet. The cache is not private to the user in any useful
 * sense, and the sheet has already copied whatever the recipient keeps.
 */
async function share(name: string, contents: unknown): Promise<boolean> {
  const file = new File(Paths.cache, name)
  file.write(JSON.stringify(contents, null, 2))

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
