import type { ReactElement } from 'react'

import { setNotificationPreferences, useNotificationPreferences } from '@/notifications/store'
import type { NotificationPreferences } from '@/plan/notification-preferences'
import { NotificationsScreen } from '@/screens/notifications'

export default function NotificationsRoute(): ReactElement {
  const preferences = useNotificationPreferences()

  return (
    <NotificationsScreen
      preferences={preferences}
      onChange={(change: Partial<NotificationPreferences>) =>
        setNotificationPreferences({ ...preferences, ...change })
      }
    />
  )
}
