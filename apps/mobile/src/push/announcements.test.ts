import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { Platform } from 'react-native'
import { push } from '../../test/firebase'
import { fake, installReminderFakes, resetReminderFakes } from '../../test/reminders'

installReminderFakes()
const { reconcileAnnouncements, setAnnouncementsEnabled, showForeground } = await import(
  './announcements'
)
const { getAnnouncements, setAnnouncements, DEFAULT_ANNOUNCEMENTS } = await import(
  '@ihsaanly/state/opt-ins/store'
)
const { setLocale } = await import('@ihsaanly/state/i18n/store')
const { recentFailures } = await import('@ihsaanly/state/storage/log')
const { getStrings } = await import('@ihsaanly/state/strings')

const strings = getStrings()
const platform = Platform as { OS: string }
const realOS = Platform.OS

function lastFailure(): string | undefined {
  return recentFailures().at(-1)?.label
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

describe('reconcileAnnouncements', () => {
  it('does nothing while the switch is off and nothing is subscribed', async () => {
    await reconcileAnnouncements()
    expect(push.calls).toEqual([])
  })

  it('subscribes to both topics in the app language once switched on', async () => {
    setAnnouncements({ enabled: true, subscribed: null })
    await reconcileAnnouncements()
    expect([...push.topics]).toEqual(['announcements', 'announcements-en'])
    expect(getAnnouncements()).toEqual({ enabled: true, subscribed: 'en' })

    // In agreement now: a second pass touches nothing.
    push.calls = []
    await reconcileAnnouncements()
    expect(push.calls).toEqual([])
  })

  it('moves to the new language topic when the language changes', async () => {
    setAnnouncements({ enabled: true, subscribed: 'en' })
    setLocale('ar')
    await reconcileAnnouncements()
    expect(push.calls).toEqual([
      ['unsubscribe', 'announcements-en'],
      ['subscribe', 'announcements-ar'],
    ])
    expect(getAnnouncements().subscribed).toBe('ar')
  })

  it('takes the language it is given', async () => {
    setAnnouncements({ enabled: true, subscribed: null })
    await reconcileAnnouncements('so')
    expect(getAnnouncements().subscribed).toBe('so')
  })

  it('leaves both topics and deletes the token once switched off', async () => {
    setAnnouncements({ enabled: false, subscribed: 'fr' })
    await reconcileAnnouncements()
    expect(push.calls).toEqual([
      ['unsubscribe', 'announcements'],
      ['unsubscribe', 'announcements-fr'],
      ['deleteToken'],
    ])
    expect(getAnnouncements()).toEqual(DEFAULT_ANNOUNCEMENTS)
  })

  it('keeps what is true and logs the failure when a change does not go through', async () => {
    setAnnouncements({ enabled: true, subscribed: null })
    push.failing.add('getToken')
    await reconcileAnnouncements()
    expect(getAnnouncements()).toEqual({ enabled: true, subscribed: null })
    expect(lastFailure()).toBe('announcements')
  })

  it('waits for a build with native Firebase', async () => {
    setAnnouncements({ enabled: true, subscribed: null })
    push.failing.add('getMessaging')
    await reconcileAnnouncements()
    expect(getAnnouncements().subscribed).toBeNull()
  })

  it('does not undo a switch flipped while a pass was running', async () => {
    setAnnouncements({ enabled: true, subscribed: null })
    // The person switches it off again while the token is being made.
    push.duringGetToken = () => setAnnouncements({ ...getAnnouncements(), enabled: false })
    await reconcileAnnouncements()
    // The first pass read "on" and subscribed; the flip stays, and the next pass leaves.
    expect(getAnnouncements()).toEqual({ enabled: false, subscribed: 'en' })
    await reconcileAnnouncements()
    expect(getAnnouncements()).toEqual(DEFAULT_ANNOUNCEMENTS)
    expect(push.token).toBeNull()
  })
})

describe('setAnnouncementsEnabled', () => {
  it('asks for permission and subscribes when it is granted', async () => {
    fake.requestResult = { granted: true }
    expect(await setAnnouncementsEnabled(true, strings)).toBe(true)
    expect(getAnnouncements()).toEqual({ enabled: true, subscribed: 'en' })
  })

  it('stays off, with no token, when permission is refused', async () => {
    fake.requestResult = { granted: false }
    expect(await setAnnouncementsEnabled(true, strings)).toBe(false)
    expect(getAnnouncements()).toEqual(DEFAULT_ANNOUNCEMENTS)
    expect(push.calls).toEqual([])
  })

  it('turns off without asking anything', async () => {
    setAnnouncements({ enabled: true, subscribed: 'en' })
    fake.failing.add('requestPermissionsAsync')
    expect(await setAnnouncementsEnabled(false, strings)).toBe(false)
    expect(getAnnouncements()).toEqual(DEFAULT_ANNOUNCEMENTS)
    expect(push.calls.at(-1)).toEqual(['deleteToken'])
  })
})

describe('showForeground', () => {
  const message = {
    id: 'm1',
    title: 'Ramadan',
    body: 'Begins tonight',
    data: { route: '/hijri' },
  }

  beforeEach(() => {
    platform.OS = 'android'
    fake.permissions = { granted: true, canAskAgain: true }
  })

  it('shows it on the reminders channel on Android, routed by its data', async () => {
    await showForeground(message, strings)
    expect(fake.scheduled).toEqual([
      {
        identifier: 'announcement:m1',
        content: {
          title: 'Ramadan',
          body: 'Begins tonight',
          data: { v: 1, kind: 'announcement', route: '/hijri', url: null },
        },
        trigger: { channelId: 'reminders' },
      },
    ])
  })

  it('shows a message without a target or an id, with empty data', async () => {
    await showForeground({ id: null, title: null, body: 'Just words', data: {} }, strings)
    expect(fake.scheduled[0]?.identifier).toStartWith('announcement:')
    expect(fake.scheduled[0]?.content).toEqual({ title: '', body: 'Just words', data: {} })
  })

  it('leaves iOS to show it itself', async () => {
    platform.OS = 'ios'
    await showForeground(message, strings)
    expect(fake.scheduled).toEqual([])
  })

  it('shows nothing for a message with nothing to show, or without permission', async () => {
    await showForeground({ ...message, title: null, body: null }, strings)
    fake.permissions = { granted: false, canAskAgain: false }
    await showForeground(message, strings)
    expect(fake.scheduled).toEqual([])
  })

  it('shows nothing where notifications are unavailable', async () => {
    fake.executionEnvironment = 'storeClient'
    await showForeground(message, strings)
    expect(fake.scheduled).toEqual([])
  })

  it('logs a message it could not show', async () => {
    fake.failing.add('scheduleNotificationAsync')
    await showForeground(message, strings)
    expect(lastFailure()).toBe('announcementShow')
  })
})
