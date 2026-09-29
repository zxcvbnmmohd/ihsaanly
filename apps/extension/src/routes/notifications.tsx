import { items, resolveText } from '@ihsaanly/core/content'
import type { Item } from '@ihsaanly/core/content/schema'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import { useLocale } from '@ihsaanly/state/i18n/store'
import { useKnownItems } from '@ihsaanly/state/memorise/store'
import { PLAN_PREFIX } from '@ihsaanly/state/notifications/payload'
import {
  setNotificationPreferences,
  useNotificationPreferences,
} from '@ihsaanly/state/notifications/store'
import { useEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { useStrings } from '@ihsaanly/state/strings'
import { NotificationsScreen, type RemindableItem } from '@ihsaanly/ui/screens/notifications'
import type { PermissionStatus } from '@ihsaanly/ui/types'
import { createFileRoute } from '@tanstack/react-router'
import { type ReactElement, useEffect, useState } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/notifications')({ component: NotificationsRoute })

function categoryOf(item: Item): 'windows' | 'lookAhead' | null {
  if (item.trigger.kind === 'window') return 'windows'
  if (item.trigger.kind === 'day') return 'lookAhead'
  return null
}

/**
 * apps/companion's route, with reminders real. The manifest's permission is
 * granted at install, but the user can still turn Chrome's notifications off
 * for the extension or the whole OS; that is what the permission row reports.
 * A test is shown straight away rather than scheduled.
 */
interface Thing {
  permission: PermissionStatus
  /** The last scheduled reminder, since reminders only extend while the popup is opened. */
  through: number | null
}

function NotificationsRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ permission: 'undetermined', through: null })
  const strings = useStrings()
  const locale = useLocale()
  const preferences = useNotificationPreferences()
  const enabled = useEnabledItems()
  const known = useKnownItems()

  useEffect(() => {
    chrome.notifications.getPermissionLevel((level) =>
      setThing((current) => ({ ...current, permission: level })),
    )
    void chrome.alarms.getAll().then((alarms) => {
      const planned = alarms.filter((alarm) => alarm.name.startsWith(PLAN_PREFIX))
      const through = planned.length > 0 ? Math.max(...planned.map((a) => a.scheduledTime)) : null
      setThing((current) => ({ ...current, through }))
    })
  }, [])

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
      {thing.through !== null ? (
        <p className="mx-4 mt-4 text-sm text-system-secondary-label">
          {strings.web.remindersThrough(
            new Intl.DateTimeFormat(locale, {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            }).format(thing.through),
          )}
        </p>
      ) : null}
      <NotificationsScreen
        preferences={preferences}
        permission={thing.permission}
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
        onOpenSettings={() =>
          chrome.tabs.create({ url: 'chrome://settings/content/notifications' })
        }
        onSendTest={() =>
          chrome.notifications.create(`test:${Date.now()}`, {
            type: 'basic',
            iconUrl: 'icon-128.png',
            title: strings.notifications.testTitle,
            message: strings.notifications.testBody,
          })
        }
      />
    </>
  )
}
