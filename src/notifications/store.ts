import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
} from '@/plan/notification-preferences'
import { createPreferenceStore } from '@/storage/preference-store'

const store = createPreferenceStore(
  'notifications',
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
)

export const setNotificationPreferences = store.set
export const useNotificationPreferences = store.use
export const getNotificationPreferences = store.get
