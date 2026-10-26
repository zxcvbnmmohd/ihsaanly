import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { civilDateKey, logDay } from '@ihsaanly/core/day/boundaries'
import { DEFAULT_USER_STATE } from '@ihsaanly/core/plan/user-state'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { setPlace } from '@ihsaanly/state/location/store'
import {
  DEFAULT_ACTION,
  LATER_DELAY_MS,
  PRAYER_AGAIN_MIN_LEFT_MS,
} from '@ihsaanly/state/notifications/payload'
import { setUserState } from '@ihsaanly/state/plan/user-state-store'
import { allActions, prayerMarksOn } from '@ihsaanly/state/storage/events'
import { fake, installReminderFakes, resetReminderFakes } from '../../test/reminders'
import { router } from '../../test/router'
import type { Response } from './respond'

installReminderFakes()
const { handleResponse } = await import('./respond')

let NOW = new Date('2026-03-10T10:00:00Z')
let counter = 0

function completions(): number {
  return allActions().filter((action) => JSON.stringify(action).includes('dhikr-morning')).length
}

function marked(prayer: Prayer): Date | undefined {
  return prayerMarksOn(civilDateKey(logDay(NOW, 'Asia/Dubai')))[prayer]
}

/** A prayer reminder whose window opened a minute ago and closes `left` from now. */
function prayerData(prayer: Prayer, left = 2 * 3_600_000): Record<string, unknown> {
  const now = NOW.getTime()
  return { v: 1, kind: 'prayer', prayer, window: { startsAt: now - 60_000, endsAt: now + left } }
}

function itemData(endsAt: number): Record<string, unknown> {
  return { v: 1, kind: 'item', itemId: 'dhikr-morning', endsAt, reason: 'upcoming' }
}

/** A fresh identifier per response, since each one is answered once. */
function response(
  actionIdentifier: string,
  data: unknown,
  content = { title: 'Morning', body: 'Time' },
): Response {
  counter += 1
  return {
    actionIdentifier,
    notification: { request: { identifier: `n${counter}`, content: { ...content, data } } },
  }
}

beforeEach(() => {
  resetReminderFakes()
  installReminderFakes()
  // A completion is identified by kind, subject and instant, so each test gets its own instant.
  NOW = new Date(NOW.getTime() + 60_000)
  setSystemTime(NOW)
  setUserState(DEFAULT_USER_STATE)
  setPlace({
    label: 'x',
    latitude: 0,
    longitude: 0,
    timeZone: 'Asia/Dubai',
    source: 'device',
  } as never)
})
afterEach(() => setSystemTime())

describe('handleResponse', () => {
  it('answers each notification and action once', async () => {
    const same = response('done', itemData(NOW.getTime() + 1000))
    const before = completions()
    await handleResponse(same)
    await handleResponse(same)
    expect(completions()).toBe(before + 1)
  })

  it('ignores a payload it cannot parse', async () => {
    await handleResponse(response(DEFAULT_ACTION, { nonsense: true }))
    expect(router.calls).toEqual([])
  })

  it('records an item completion on Done', async () => {
    const before = completions()
    await handleResponse(response('done', itemData(NOW.getTime() + 1000)))
    expect(completions()).toBe(before + 1)
  })

  it('records nothing on Done for a non-item payload', async () => {
    const before = completions()
    await handleResponse(response('done', { v: 1, kind: 'test' }))
    expect(completions()).toBe(before)
  })

  it('falls back to UTC when no place is set', async () => {
    setPlace(null as never)
    const before = completions()
    await handleResponse(response('done', itemData(NOW.getTime() + 1000)))
    expect(completions()).toBe(before + 1)
  })

  it('snoozes an item by the delay while its window is open', async () => {
    await handleResponse(response('later', itemData(NOW.getTime() + 2 * LATER_DELAY_MS)))
    expect(fake.scheduled).toHaveLength(1)
    const [request] = fake.scheduled
    expect(request?.identifier).toBe(`later:dhikr-morning@${NOW.getTime() + LATER_DELAY_MS}`)
    expect(request?.content).toMatchObject({
      title: 'Morning',
      body: 'Time',
      categoryIdentifier: 'reminder',
    })
  })

  it('uses the item id and an empty body when the notification had none', async () => {
    await handleResponse(
      response('later', itemData(NOW.getTime() + 2 * LATER_DELAY_MS), {
        title: null as never,
        body: null as never,
      }),
    )
    expect(fake.scheduled[0]?.content).toMatchObject({ title: 'dhikr-morning', body: '' })
  })

  it('does not snooze past the end of the window', async () => {
    await handleResponse(response('later', itemData(NOW.getTime() + LATER_DELAY_MS)))
    expect(fake.scheduled).toEqual([])
  })

  it('does not snooze a reminder that is neither an item nor a prayer', async () => {
    await handleResponse(response('later', { v: 1, kind: 'test' }))
    expect(fake.scheduled).toEqual([])
  })

  it('opens an item with nothing to read (or unknown) on its screen on a tap', async () => {
    await handleResponse(response(DEFAULT_ACTION, itemData(NOW.getTime() + 1000)))
    expect(router.calls).toEqual([['push', '/item/dhikr-morning']])
  })

  it('opens a dua or dhikr in the focused reader on a tap', async () => {
    await handleResponse(
      response(DEFAULT_ACTION, { ...itemData(NOW.getTime() + 1000), itemId: 'morning-adhkar' }),
    )
    expect(router.calls).toEqual([['push', '/item/read/morning-adhkar']])
  })

  it('opens notification settings after a test reminder tap', async () => {
    await handleResponse(response(DEFAULT_ACTION, { v: 1, kind: 'test' }))
    expect(router.calls).toEqual([['push', '/notifications']])
  })

  it('follows an announcement shown while the app was open', async () => {
    await handleResponse(
      response(DEFAULT_ACTION, { v: 1, kind: 'announcement', route: '/hijri', url: null }),
    )
    expect(router.calls).toEqual([['push', '/hijri']])
  })

  it('follows a pushed announcement by its raw data, as iOS reports the tap', async () => {
    await handleResponse(response(DEFAULT_ACTION, { route: '/library', 'gcm.message_id': '1' }))
    expect(router.calls).toEqual([['push', '/library']])
  })

  it('opens home for a prayer reminder, and for unknown actions', async () => {
    await handleResponse(response(DEFAULT_ACTION, { v: 1, kind: 'prayer', prayer: 'fajr' }))
    await handleResponse(response('something-else', { v: 1, kind: 'prayer', prayer: 'fajr' }))
    expect(router.calls).toEqual([
      ['push', '/'],
      ['push', '/'],
    ])
  })

  it('opens Today for a check-in reminder', async () => {
    await handleResponse(response(DEFAULT_ACTION, { v: 1, kind: 'check-in' }))
    expect(router.calls).toEqual([['push', '/']])
  })

  it('does not navigate from the background', async () => {
    await handleResponse(response(DEFAULT_ACTION, itemData(NOW.getTime() + 1000)), false)
    expect(router.calls).toEqual([])
  })
})

describe('a prayer reminder', () => {
  const asked = { title: 'Asr has come in', body: 'Have you prayed?' }

  it('marks the prayer on "Yes, I\'ve prayed", as the Today strip does', async () => {
    expect(marked('asr')).toBeUndefined()
    await handleResponse(response('done', prayerData('asr'), asked))
    expect(marked('asr')).toEqual(NOW)
  })

  it('marks an older reminder that carried no window too', async () => {
    await handleResponse(response('done', { v: 1, kind: 'prayer', prayer: 'dhuhr' }, asked))
    expect(marked('dhuhr')).toEqual(NOW)
  })

  it('leaves a prayer already marked in the app as it was', async () => {
    await handleResponse(response('done', prayerData('maghrib'), asked))
    const first = marked('maghrib')
    NOW = new Date(NOW.getTime() + 60_000)
    setSystemTime(NOW)
    await handleResponse(response('done', prayerData('maghrib'), asked))
    expect(marked('maghrib')).toEqual(first as Date)
  })

  it('asks once more, half an hour later, with only the first button', async () => {
    await handleResponse(response('later', prayerData('asr'), asked))
    expect(fake.scheduled).toHaveLength(1)
    const [request] = fake.scheduled
    expect(request?.identifier).toBe(`later:prayer:asr@${NOW.getTime() + LATER_DELAY_MS}`)
    expect(request?.content).toMatchObject({ ...asked, categoryIdentifier: 'prayer-again' })
    expect(request?.trigger).toMatchObject({ channelId: 'prayers' })
  })

  it('keeps empty words when the notification had none', async () => {
    await handleResponse(
      response('later', prayerData('asr'), { title: null as never, body: null as never }),
    )
    expect(fake.scheduled[0]?.content).toMatchObject({ title: '', body: '' })
  })

  it('does not ask again in the last minutes of the window, or past it', async () => {
    const tooLate = LATER_DELAY_MS + PRAYER_AGAIN_MIN_LEFT_MS - 1
    await handleResponse(response('later', prayerData('fajr', tooLate), asked))
    await handleResponse(response('later', prayerData('fajr', LATER_DELAY_MS / 2), asked))
    expect(fake.scheduled).toEqual([])

    await handleResponse(response('later', prayerData('fajr', tooLate + 1), asked))
    expect(fake.scheduled).toHaveLength(1)
  })

  it('does not ask again without knowing when the window closes', async () => {
    await handleResponse(response('later', { v: 1, kind: 'prayer', prayer: 'asr' }, asked))
    expect(fake.scheduled).toEqual([])
  })

  it('neither marks nor asks again while tracking is paused', async () => {
    setUserState({ ...DEFAULT_USER_STATE, trackingPaused: true })
    await handleResponse(response('done', prayerData('isha'), asked))
    await handleResponse(response('later', prayerData('isha'), asked))
    expect(marked('isha')).toBeUndefined()
    expect(fake.scheduled).toEqual([])
  })
})
