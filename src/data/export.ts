import * as Device from 'expo-device'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { getLocales } from 'expo-localization'
import { Platform } from 'react-native'
import Constants from 'expo-constants'

import { getNotificationPreferences } from '@/notifications/store'
import { getPlace } from '@/location/store'
import { allActions, allPreferences, lastStorageError } from '@/storage/events'

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
 * and why they are shown what it contains first.
 */
export function buildDiagnostics(): Record<string, unknown> {
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
    locale: getLocales()[0]?.languageTag ?? 'unknown',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    coordinates: place ? { latitude: place.latitude, longitude: place.longitude } : null,
    notifications: getNotificationPreferences(),
    lastStorageError: lastStorageError(),
    data: buildExport(),
  }
}

async function share(name: string, contents: unknown): Promise<boolean> {
  const file = new File(Paths.cache, name)
  file.write(JSON.stringify(contents, null, 2))

  if (!(await Sharing.isAvailableAsync())) return false

  await Sharing.shareAsync(file.uri, { mimeType: 'application/json' })
  return true
}

export function shareExport(): Promise<boolean> {
  return share('ihsaanly-data.json', buildExport())
}

export function shareDiagnostics(): Promise<boolean> {
  return share('ihsaanly-diagnostics.json', buildDiagnostics())
}
