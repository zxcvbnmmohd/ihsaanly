import { items, resolveText } from '@ihsaanly/core/content'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import { reminderCategoryOf } from '@ihsaanly/core/plan/plan'
import { useKnownItems } from '@ihsaanly/state/memorise/store'
import {
  setNotificationPreferences,
  useNotificationPreferences,
} from '@ihsaanly/state/notifications/store'
import { useAnnouncements } from '@ihsaanly/state/opt-ins/store'
import { useEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { getStrings } from '@ihsaanly/state/strings'
import { NotificationsScreen, type RemindableItem } from '@ihsaanly/ui/screens/notifications'
import * as Linking from 'expo-linking'
import type { ReactElement } from 'react'
import { usePermissionStatus } from '@/notifications/permission-store'
import { scheduleTest } from '@/notifications/schedule'
import { setAnnouncementsEnabled } from '@/push/announcements'

/** Only window and calendar items, and Witr, are ever scheduled; the rest have no moment. */
export default function NotificationsRoute(): ReactElement {
  const preferences = useNotificationPreferences()
  const permission = usePermissionStatus()
  const enabled = useEnabledItems()
  const known = useKnownItems()
  const announcements = useAnnouncements()

  const remindable: RemindableItem[] = items.flatMap((item) => {
    const category = reminderCategoryOf(item)
    if (!category || !enabled.includes(item.id) || known.includes(item.id)) return []
    return [
      {
        id: item.id,
        title: resolveText(item.title) ?? item.id,
        on: preferences.perItem[item.id] ?? preferences[category],
      },
    ]
  })

  return (
    <NotificationsScreen
      preferences={preferences}
      permission={permission}
      items={remindable}
      onChange={(change: Partial<NotificationPreferences>) =>
        setNotificationPreferences({ ...preferences, ...change })
      }
      onToggleItem={(id, on) =>
        setNotificationPreferences({
          ...preferences,
          perItem: { ...preferences.perItem, [id]: on },
        })
      }
      onOpenSettings={() => void Linking.openSettings()}
      onSendTest={() => void scheduleTest(getStrings())}
      announcements={{
        on: announcements.enabled,
        onChange: (on) => void setAnnouncementsEnabled(on, getStrings()),
      }}
    />
  )
}
