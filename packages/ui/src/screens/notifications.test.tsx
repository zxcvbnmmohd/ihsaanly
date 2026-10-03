import { describe, expect, it, mock } from 'bun:test'
import type { NotificationPreferences } from '@ihsaanly/core/plan/notification-preferences'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import type { PermissionStatus } from '../types'
import { notificationsFixture } from './fixtures'
import {
  NotificationsScreen,
  PER_DAY_OPTIONS,
  permissionLabel,
  QUIET_HOUR_PRESETS,
} from './notifications'

describe('permissionLabel', () => {
  it.each([
    ['granted', 'permissionGranted'],
    ['denied', 'permissionDenied'],
    ['undetermined', 'permissionUndetermined'],
    ['unavailable', 'permissionUnavailable'],
  ] as const satisfies readonly [PermissionStatus, string][])('says %s in words', (status, key) => {
    const { strings } = renderScreen(<span />)
    expect(permissionLabel(status, strings)).toBe(strings.notifications[key])
  })
})

describe('NotificationsScreen', () => {
  it('shows the permission and the current choices', () => {
    const { strings } = renderScreen(<NotificationsScreen {...notificationsFixture} />)
    expect(screen.getByText(strings.notifications.permissionGranted)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.notifications.openSettings })).toBeNull()
    expect(screen.getByRole('switch', { name: strings.notifications.windows })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByRole('switch', { name: strings.notifications.prayers })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getAllByRole('radio')).toHaveLength(
      QUIET_HOUR_PRESETS.length + PER_DAY_OPTIONS.length,
    )
    expect(
      screen.getByRole('radio', { name: strings.notifications.quietHoursDetail(22, 7) }),
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '3' })).toHaveAttribute('aria-checked', 'true')
  })

  it('reports every preference change', async () => {
    const onChange = mock((_change: Partial<NotificationPreferences>) => {})
    const { user, strings } = renderScreen(
      <NotificationsScreen {...notificationsFixture} onChange={onChange} />,
    )
    await user.click(screen.getByRole('switch', { name: strings.notifications.windows }))
    await user.click(screen.getByRole('switch', { name: strings.notifications.lookAhead }))
    await user.click(screen.getByRole('switch', { name: strings.notifications.prayers }))
    await user.click(screen.getByRole('radio', { name: strings.notifications.quietHoursOff }))
    await user.click(screen.getByRole('radio', { name: '5' }))
    expect(onChange.mock.calls.map(([change]) => change)).toEqual([
      { windows: false },
      { lookAhead: false },
      { prayers: true },
      { quietHours: null },
      { maxPerDay: 5 },
    ])
  })

  it('toggles a single item and sends a test', async () => {
    const onToggleItem = mock((_id: string, _on: boolean) => {})
    const onSendTest = mock(() => {})
    const { user, strings } = renderScreen(
      <NotificationsScreen
        {...notificationsFixture}
        onToggleItem={onToggleItem}
        onSendTest={onSendTest}
      />,
    )
    await user.click(screen.getByRole('switch', { name: 'Morning adhkar' }))
    expect(onToggleItem).toHaveBeenCalledWith('morning-adhkar', false)
    await user.click(screen.getByRole('button', { name: named(strings.notifications.sendTest) }))
    expect(onSendTest).toHaveBeenCalledTimes(1)
  })

  it('leaves out the item list when none can be reminded', () => {
    const { strings } = renderScreen(<NotificationsScreen {...notificationsFixture} items={[]} />)
    expect(screen.queryByRole('heading', { name: strings.notifications.whichItems })).toBeNull()
  })

  it('offers system settings when permission is denied', async () => {
    const onOpenSettings = mock(() => {})
    const { user, strings } = renderScreen(
      <NotificationsScreen
        {...notificationsFixture}
        permission="denied"
        onOpenSettings={onOpenSettings}
      />,
    )
    await user.click(screen.getByRole('button', { name: strings.notifications.openSettings }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('selects Off when no quiet hours are set', () => {
    const { strings } = renderScreen(
      <NotificationsScreen
        {...notificationsFixture}
        preferences={{ ...notificationsFixture.preferences, quietHours: null }}
      />,
    )
    expect(
      screen.getByRole('radio', { name: strings.notifications.quietHoursOff }),
    ).toHaveAttribute('aria-checked', 'true')
  })
})
