import { items, resolveText } from '@ihsaanly/core/content'
import type { Item } from '@ihsaanly/core/content/schema'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import { useKnownItems } from '@ihsaanly/state/memorise/store'
import {
  setNotificationPreferences,
  useNotificationPreferences,
} from '@ihsaanly/state/notifications/store'
import { useEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { useStrings } from '@ihsaanly/state/strings'
import { NotificationsScreen, type RemindableItem } from '@ihsaanly/ui/screens/notifications'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'
import { openSystemSettings } from '~/platform/open-settings'

export const Route = createFileRoute('/_more/notifications')({ component: NotificationsRoute })

function categoryOf(item: Item): 'windows' | 'lookAhead' | null {
  if (item.trigger.kind === 'window') return 'windows'
  if (item.trigger.kind === 'day') return 'lookAhead'
  return null
}

/**
 * capabilities.reminders is off on the web: nothing here is ever actually
 * scheduled. The preferences still save (so export/import round-trips them
 * to the phone unchanged); permission always reads "unavailable" and "send
 * test" explains why instead of doing anything.
 */
function NotificationsRoute(): ReactElement {
  const strings = useStrings()
  const preferences = useNotificationPreferences()
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
    <>
      <PageHeader title={strings.notifications.title} />
      <p className="mx-4 mt-4 text-sm text-system-secondary-label">
        {strings.web.remindersUnavailable}
      </p>
      <NotificationsScreen
        preferences={preferences}
        permission="unavailable"
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
        onOpenSettings={openSystemSettings}
        onSendTest={() => window.alert(strings.web.remindersUnavailable)}
      />
    </>
  )
}
