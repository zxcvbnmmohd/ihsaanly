import '../../../test/more'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { items, resolveText } from '@ihsaanly/core/content'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import { act, render } from '@testing-library/react'
import { push } from '../../../test/firebase'
import { flush, last, mockScreen } from '../../../test/more'

interface Remindable {
  id: string
  title: string
  on: boolean
}
interface Props {
  preferences: NotificationPreferences
  permission: string
  items: Remindable[]
  onChange: (change: Partial<NotificationPreferences>) => void
  onToggleItem: (id: string, on: boolean) => void
  onOpenSettings: () => void
  onSendTest: () => void
  announcements: { on: boolean; onChange: (on: boolean) => void }
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/notifications', 'NotificationsScreen')

const native = {
  granted: false,
  canAskAgain: true,
  scheduled: [] as { identifier: string }[],
  opened: [] as string[],
}
mock.module('expo-linking', () => ({
  openSettings: async () => void native.opened.push('settings'),
}))
mock.module('expo-constants', () => ({
  default: { executionEnvironment: 'standalone' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}))
mock.module('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: async () => ({ granted: native.granted, canAskAgain: native.canAskAgain }),
  requestPermissionsAsync: async () => ({ granted: true }),
  getAllScheduledNotificationsAsync: async () => [],
  scheduleNotificationAsync: async (request: { identifier: string }) =>
    void native.scheduled.push(request),
  cancelScheduledNotificationAsync: async () => {},
  setNotificationChannelAsync: async () => {},
  setNotificationCategoryAsync: async () => {},
  registerTaskAsync: async () => {},
}))

const { default: NotificationsRoute } = await import('../../app/(more)/notifications')
const { DEFAULT_NOTIFICATION_PREFERENCES } = await import(
  '@ihsaanly/core/plan/notification-preferences'
)
const { getNotificationPreferences, setNotificationPreferences } = await import(
  '@ihsaanly/state/notifications/store'
)
const { setEnabledItems } = await import('@ihsaanly/state/plan/enabled-store')
const { setKnownItems } = await import('@ihsaanly/state/memorise/store')
const { DEFAULT_ANNOUNCEMENTS, getAnnouncements, setAnnouncements } = await import(
  '@ihsaanly/state/opt-ins/store'
)

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))
const windowItem = items.find((item) => item.trigger.kind === 'window')
const dayItem = items.find((item) => item.trigger.kind === 'day')
const otherItem = items.find((item) => !['window', 'day'].includes(item.trigger.kind))

describe('notifications route', () => {
  beforeEach(() => {
    renders.length = 0
    native.granted = false
    native.canAskAgain = true
    native.scheduled.length = 0
    native.opened.length = 0
    setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)
    setEnabledItems([])
    setKnownItems([])
    setAnnouncements(DEFAULT_ANNOUNCEMENTS)
  })

  it('lists only enabled, unknown window and day items, with their effective state', () => {
    if (!windowItem || !dayItem || !otherItem) throw new Error('content lacks a trigger kind')
    setEnabledItems([windowItem.id, dayItem.id, otherItem.id])
    setNotificationPreferences({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      windows: true,
      lookAhead: false,
      perItem: {},
    })
    render(<NotificationsRoute />)
    // Content order, windows on and look-ahead off; the "other" item is left out.
    const expected = items
      .filter((item) => item === windowItem || item === dayItem)
      .map((item) => ({
        id: item.id,
        title: resolveText(item.title) ?? item.id,
        on: item === windowItem,
      }))
    expect(last(renders).items).toEqual(expected)

    act(() => setKnownItems([windowItem.id]))
    expect(last(renders).items.map((i) => i.id)).toEqual([dayItem.id])

    act(() =>
      setNotificationPreferences({
        ...getNotificationPreferences(),
        perItem: { [dayItem.id]: true },
      }),
    )
    expect(last(renders).items[0]?.on).toBe(true)
  })

  it('merges a preference change', () => {
    render(<NotificationsRoute />)
    act(() => last(renders).onChange({ windows: false }))
    expect(getNotificationPreferences()).toEqual({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      windows: false,
    })
  })

  it('sets a per-item override', () => {
    render(<NotificationsRoute />)
    act(() => last(renders).onToggleItem('a', true))
    act(() => last(renders).onToggleItem('b', false))
    expect(getNotificationPreferences().perItem).toEqual({ a: true, b: false })
  })

  it('reports the OS permission', async () => {
    render(<NotificationsRoute />)
    await flush()
    expect(last(renders).permission).toBe('undetermined')
    native.granted = true
    // Refreshed on mount; a remount reads the new answer.
    render(<NotificationsRoute />)
    await flush()
    expect(last(renders).permission).toBe('granted')
  })

  it('opens system settings', async () => {
    render(<NotificationsRoute />)
    act(() => last(renders).onOpenSettings())
    await settle()
    expect(native.opened).toEqual(['settings'])
  })

  it('schedules a test reminder', async () => {
    render(<NotificationsRoute />)
    act(() => last(renders).onSendTest())
    await settle()
    expect(native.scheduled).toHaveLength(1)
    expect(native.scheduled[0]?.identifier).toStartWith('test:')
  })

  it('turns announcements on and off from the switch', async () => {
    render(<NotificationsRoute />)
    expect(last(renders).announcements.on).toBe(false)

    act(() => last(renders).announcements.onChange(true))
    await settle()
    await flush()
    expect(getAnnouncements().enabled).toBe(true)
    expect(last(renders).announcements.on).toBe(true)
    expect(push.topics.has('announcements')).toBe(true)

    act(() => last(renders).announcements.onChange(false))
    await settle()
    await flush()
    expect(getAnnouncements()).toEqual(DEFAULT_ANNOUNCEMENTS)
    expect(push.topics.size).toBe(0)
  })
})
