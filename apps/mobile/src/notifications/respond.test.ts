import { afterEach, beforeEach, describe, expect, it, setSystemTime } from 'bun:test'
import { setPlace } from '@ihsaanly/state/location/store'
import { DEFAULT_ACTION, LATER_DELAY_MS } from '@ihsaanly/state/notifications/payload'
import { allActions } from '@ihsaanly/state/storage/events'
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

  it('does not snooze a non-item reminder', async () => {
    await handleResponse(response('later', { v: 1, kind: 'prayer', prayer: 'asr' }))
    expect(fake.scheduled).toEqual([])
  })

  it('opens the item on a tap', async () => {
    await handleResponse(response(DEFAULT_ACTION, itemData(NOW.getTime() + 1000)))
    expect(router.calls).toEqual([['push', '/item/dhikr-morning']])
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
