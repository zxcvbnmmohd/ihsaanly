import type { FeedbackDiagnostics } from '@ihsaanly/cloud/ports'

import { PROGRESS_PREFIX } from '../cloud/keys'
import { roundCoordinate } from '../cloud/local-store'
import {
  buildDiagnostics,
  type Diagnostics,
  type DiagnosticsApp,
  type DiagnosticsReminders,
} from '../data/export'
import { getPlace } from '../location/store'

/** Enough to see a pattern; the rest of the log stays on the device. */
export const FEEDBACK_FAILURE_LIMIT = 20
/** A message long enough to recognise, short enough to never carry a payload. */
export const FEEDBACK_MESSAGE_LIMIT = 300

const clip = (text: string, limit = FEEDBACK_MESSAGE_LIMIT): string =>
  text.length > limit ? `${text.slice(0, limit)}…` : text

/**
 * The share-sheet diagnostics cut down to what travels with feedback: the
 * context a bug needs, and only a summary of the user's data — counts per
 * event kind, how many days, how many preferences and tracked items — never
 * the events, the values or even the preference names (`progress:<itemId>`
 * would say which practices the person tracks). `place` is the raw place, rounded here to ~1 km (the synced
 * place's precision), not the ~100 m the share-sheet report uses.
 */
export function trimDiagnostics(
  full: Diagnostics,
  place: { latitude: number; longitude: number } | null,
): FeedbackDiagnostics {
  const eventCounts: Record<string, number> = {}
  for (const event of full.data.events) eventCounts[event.kind] = (eventCounts[event.kind] ?? 0) + 1
  const { perItem, ...notifications } = full.notifications
  const preferenceKeys = Object.keys(full.data.preferences)

  return {
    generatedAt: full.generatedAt,
    app: full.app,
    locale: full.locale,
    timeZone: full.timeZone,
    utcOffsetMinutes: full.utcOffsetMinutes,
    daylightSaving: full.daylightSaving,
    coordinates: place
      ? { latitude: roundCoordinate(place.latitude), longitude: roundCoordinate(place.longitude) }
      : null,
    notifications: { ...notifications, perItemOverrides: Object.keys(perItem).length },
    reminders: { permission: full.reminders.permission, pending: full.reminders.pending.length },
    lastStorageError: full.lastStorageError === null ? null : clip(full.lastStorageError),
    failures: full.failures
      .slice(-FEEDBACK_FAILURE_LIMIT)
      .map(({ at, label, message }) => ({ at, label, message: clip(message) })),
    data: {
      eventCounts,
      days: new Set(full.data.events.map((event) => event.logDay)).size,
      preferences: preferenceKeys.length,
      trackedItems: preferenceKeys.filter((key) => key.startsWith(PROGRESS_PREFIX)).length,
    },
  }
}

/**
 * What "Include diagnostic info" attaches. Each surface supplies its app and
 * reminder details exactly as its Diagnostics screen already does.
 */
export function buildFeedbackDiagnostics(
  app: DiagnosticsApp,
  reminders: DiagnosticsReminders,
): FeedbackDiagnostics {
  return trimDiagnostics(buildDiagnostics(app, reminders), getPlace())
}
