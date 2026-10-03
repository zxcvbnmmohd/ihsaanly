import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { Platform } from 'react-native'
import { run, settle } from '../../test/act'
import { push } from '../../test/firebase'
import { fake, installReminderFakes, resetReminderFakes } from '../../test/reminders'
import { router } from '../../test/router'

installReminderFakes()
const { useAnnouncements } = await import('./use-announcements')
const { getAnnouncements, setAnnouncements, DEFAULT_ANNOUNCEMENTS } = await import(
  '@ihsaanly/state/opt-ins/store'
)
const { setLocale } = await import('@ihsaanly/state/i18n/store')

const platform = Platform as { OS: string }
const realOS = Platform.OS

// Taps on the same target close together count once, so each test routes somewhere new.
let counter = 0
function route(): string {
  counter += 1
  return `/item/n${counter}`
}

function optIn(): void {
  setAnnouncements({ enabled: true, subscribed: 'en' })
}

beforeEach(() => {
  resetReminderFakes()
  installReminderFakes()
  setLocale('en-GB')
  setAnnouncements(DEFAULT_ANNOUNCEMENTS)
})
afterEach(() => {
  platform.OS = realOS
})

describe('useAnnouncements', () => {
  it('does nothing until onboarding is done', async () => {
    setAnnouncements({ enabled: true, subscribed: null })
    push.initial = { data: { route: route() } }
    renderHook(() => useAnnouncements(false))
    await settle()
    expect(push.calls).toEqual([])
    expect(push.foreground).toEqual([])
    expect(router.calls).toEqual([])
  })

  it('subscribes, and follows the app language', async () => {
    setAnnouncements({ enabled: true, subscribed: null })
    renderHook(() => useAnnouncements(true))
    await settle()
    expect(getAnnouncements().subscribed).toBe('en')

    await run(() => setLocale('fr'))
    await settle()
    expect(getAnnouncements().subscribed).toBe('fr')
  })

  it('never touches Firebase for someone who has not opted in', async () => {
    push.initial = { data: { route: route() } }
    renderHook(() => useAnnouncements(true))
    await settle()
    expect(push.calls).toEqual([])
    expect(push.foreground).toEqual([])
    expect(router.calls).toEqual([])
  })

  it('registers with APNs at launch while opted in, and carries on if it cannot', async () => {
    setAnnouncements({ enabled: true, subscribed: 'en' })
    push.failing.add('registerDeviceForRemoteMessages')
    renderHook(() => useAnnouncements(true))
    await settle()
    expect(push.foreground).toHaveLength(1)
  })

  it('follows the tap that launched the app', async () => {
    optIn()
    const target = route()
    push.initial = { data: { route: target } }
    renderHook(() => useAnnouncements(true))
    await settle()
    expect(router.calls).toEqual([['push', target]])
  })

  it('follows taps while running, and ignores messages without a target', async () => {
    optIn()
    renderHook(() => useAnnouncements(true))
    await settle()
    const target = route()
    push.opened[0]?.({ data: { route: target } })
    push.opened[0]?.({ data: {} })
    expect(router.calls).toEqual([['push', target]])
  })

  it('shows a message that arrives while open', async () => {
    optIn()
    platform.OS = 'android'
    fake.permissions = { granted: true, canAskAgain: true }
    renderHook(() => useAnnouncements(true))
    await settle()
    push.foreground[0]?.({ messageId: 'f1', notification: { title: 'T', body: 'B' } })
    await settle()
    expect(fake.scheduled.map((request) => request.identifier)).toEqual(['announcement:f1'])
  })

  it('stops listening on unmount', async () => {
    optIn()
    const view = renderHook(() => useAnnouncements(true))
    await settle()
    view.unmount()
    expect(push.foreground).toEqual([])
    expect(push.opened).toEqual([])
  })

  it('does not start listening when unmounted before Firebase answered', async () => {
    optIn()
    push.initial = { data: { route: route() } }
    const view = renderHook(() => useAnnouncements(true))
    view.unmount()
    await settle()
    expect(push.foreground).toEqual([])
    expect(router.calls).toEqual([])
  })

  it('does nothing without native Firebase', async () => {
    optIn()
    push.failing.add('getMessaging')
    renderHook(() => useAnnouncements(true))
    await settle()
    expect(push.foreground).toEqual([])
  })
})
