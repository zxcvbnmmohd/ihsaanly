import * as Linking from 'expo-linking'
import type { ReactElement } from 'react'

import { items, resolveText } from '@/content'
import type { Item } from '@/content/schema'
import { useKnownItems } from '@/memorise/store'
import { usePermissionStatus } from '@/notifications/permission-store'
import { scheduleTest } from '@/notifications/schedule'
import { setNotificationPreferences, useNotificationPreferences } from '@/notifications/store'
import { useEnabledItems } from '@/plan/enabled-store'
import type { NotificationPreferences } from '@/plan/notification-preferences'
import { NotificationsScreen, type RemindableItem } from '@/screens/notifications'
import { getStrings } from '@/strings'

/** Only window and calendar items are ever scheduled; the rest have no moment to remind of. */
function categoryOf(item: Item): 'windows' | 'lookAhead' | null {
  if (item.trigger.kind === 'window') return 'windows'
  if (item.trigger.kind === 'day') return 'lookAhead'
  return null
}

export default function NotificationsRoute(): ReactElement {
  const preferences = useNotificationPreferences()
  const permission = usePermissionStatus()
  const enabled = useEnabledItems()
  const known = useKnownItems()

  const remindable: RemindableItem[] = items.flatMap((item) => {
    const category = categoryOf(item)
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
    />
  )
}
