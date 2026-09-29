// The platform-agnostic half of building an export or a diagnostics bundle:
// pure reads over the stores plus the arithmetic around them. Every host
// (mobile, companion) shares this, and just supplies what only it knows —
// app/device identity and whatever it can say about pending reminders — and
// the last step of getting the JSON to the user (share sheet vs download).
import { EXPORT_VERSION, type ExportedData } from '@ihsaanly/core/data/bundle'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import type { PermissionStatus } from '@ihsaanly/ui/types'
import { DEVICE_ONLY_KEYS } from '../cloud/keys'
import { deviceLocaleTags } from '../i18n/device'
import { getPlace } from '../location/store'
import { getNotificationPreferences } from '../notifications/store'
import { allActions, allPreferences, lastStorageError } from '../storage/events'
import type { FailureEntry } from '../storage/failure-entry'
import { recentFailures } from '../storage/log'

function toExportedEvents(): ExportedData['events'] {
  return allActions().map((action) => ({
    kind: action.kind,
    subject: action.subject,
    at: action.at,
    logDay: action.logDay,
    deltaSeconds: action.deltaSeconds,
  }))
}

/** The user's settings, without sync's bookkeeping: an export is theirs, not this device's. */
function exportedPreferences(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(allPreferences()).filter(([key]) => !DEVICE_ONLY_KEYS.has(key)),
  )
}

export function buildExport(): ExportedData {
  return {
    format: 'ihsaanly-export',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    preferences: exportedPreferences(),
    events: toExportedEvents(),
  }
}

/** What only the host knows about the app and the device it runs on. */
export interface DiagnosticsApp {
  version: string
  platform: string
  osVersion: string
  device: string
}

/** What only the host can say about reminders: mobile asks the OS; web has none to ask. */
export interface DiagnosticsReminders {
  permission: PermissionStatus
  pending: { id: string; at: string | null }[]
}

/**
 * Everything needed to replay what the user saw. Coordinates are in here, and
 * so is their practice — which is why nothing leaves without them choosing it,
 * and why the preview screen shows them what it contains first.
 */
export interface Diagnostics {
  format: 'ihsaanly-diagnostics'
  generatedAt: string
  app: DiagnosticsApp
  locale: string
  timeZone: string
  /** Offset now, and whether that is the summer one — a whole class of window bugs. */
  utcOffsetMinutes: number
  daylightSaving: boolean
  coordinates: { latitude: number; longitude: number } | null
  notifications: NotificationPreferences
  /** Whether reminders may be delivered at all, and what is queued right now. */
  reminders: DiagnosticsReminders
  lastStorageError: string | null
  /** The failures the user never saw, oldest first, across launches. */
  failures: FailureEntry[]
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

/**
 * True when the current offset is not the smaller of this year's two. A window
 * that was an hour out is nearly always this, and the timezone name alone does
 * not say which side of the change the device is on.
 */
function daylightSaving(now: Date): boolean {
  const offsetIn = (month: number): number =>
    -new Date(now.getFullYear(), month, 1).getTimezoneOffset()
  return -now.getTimezoneOffset() > Math.min(offsetIn(0), offsetIn(6))
}

/**
 * Builds everything about diagnostics that does not depend on a native API:
 * locale, timezone, coordinates, notification preferences, storage failures
 * and the export itself. The caller supplies the two things only it can
 * answer — app/device identity, and reminder permission/queue state.
 */
export function buildDiagnostics(
  app: DiagnosticsApp,
  reminders: DiagnosticsReminders,
): Diagnostics {
  const place = getPlace()
  const now = new Date()

  return {
    format: 'ihsaanly-diagnostics',
    generatedAt: now.toISOString(),
    app,
    locale: deviceLocaleTags()[0] ?? 'unknown',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utcOffsetMinutes: -now.getTimezoneOffset(),
    daylightSaving: daylightSaving(now),
    coordinates: place ? approximate(place) : null,
    notifications: getNotificationPreferences(),
    reminders,
    lastStorageError: lastStorageError(),
    failures: recentFailures(),
    data: buildExport(),
  }
}
