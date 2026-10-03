import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import { z } from 'zod'
import { ANNOUNCEMENTS_KEY, CRASH_REPORTS_KEY } from '../cloud/keys'
import { createPreferenceStore } from '../storage/preference-store'

/**
 * Announcements: occasional messages sent to everyone who opted in, through
 * push topics. `enabled` is what the person chose; `subscribed` is the
 * language whose topic this device is actually subscribed to, or null when it
 * is subscribed to none. The two differ while a change is still being applied
 * (or failed offline), and the app reconciles them until they agree.
 */
export const AnnouncementsPreference = z.object({
  enabled: z.boolean(),
  subscribed: z.enum(SUPPORTED_LANGUAGES).nullable(),
})

export type AnnouncementsPreference = z.infer<typeof AnnouncementsPreference>

export const DEFAULT_ANNOUNCEMENTS: AnnouncementsPreference = { enabled: false, subscribed: null }

/** Everyone who opted in, and everyone who reads this language. */
export const ANNOUNCEMENT_TOPIC = 'announcements'

export function languageTopic(language: SupportedLanguage): string {
  return `${ANNOUNCEMENT_TOPIC}-${language}`
}

export function announcementTopics(language: SupportedLanguage): string[] {
  return [ANNOUNCEMENT_TOPIC, languageTopic(language)]
}

const announcements = createPreferenceStore(
  ANNOUNCEMENTS_KEY,
  AnnouncementsPreference,
  DEFAULT_ANNOUNCEMENTS,
)

export const getAnnouncements = announcements.get
export const setAnnouncements = announcements.set
export const useAnnouncements = announcements.use

/** Off until the person turns it on. Nothing is sent before that. */
const crashReports = createPreferenceStore(CRASH_REPORTS_KEY, z.boolean(), false)

export const getCrashReports = crashReports.get
export const setCrashReports = crashReports.set
export const useCrashReports = crashReports.use
