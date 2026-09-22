import { describe, expect, it } from 'bun:test'

import type { Item, Trigger } from '@/content/schema'
import type { Place } from '@/location/place'
import { DEFAULT_CALCULATION_PREFERENCES } from '@/prayer/calculation'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows } from '@/prayer/windows'

import { DEFAULT_NOTIFICATION_PREFERENCES } from './notification-preferences'
import type { Signals } from './signals'
import { DEFAULT_SUGGESTION, suggest, SUGGESTION_INTERVAL_MS } from './suggest'

const toronto: Place = {
  label: 'Toronto',
  latitude: 43.7,
  longitude: -79.42,
  timeZone: 'America/Toronto',
  source: 'city',
}
const anchor = new Date('2026-09-17T12:00:00Z')
const times = prayerTimesAcross(toronto, anchor, DEFAULT_CALCULATION_PREFERENCES)
const asr = buildWindows(times).find((w) => w.name === 'asr' && w.startsAt > anchor)
if (!asr) throw new Error('no asr window in fixture')
const now = new Date(asr.startsAt.getTime() + 60_000)

function item(id: string, trigger: Trigger, overrides: Partial<Item> = {}): Item {
  return {
    id,
    category: 'test',
    title: { en: id },
    ruling: 'sunnah',
    arabic: null,
    transliteration: null,
    translation: null,
    repeat: 1,
    evidence: [],
    trigger,
    defaultOn: false,
    note: null,
    why: null,
    how: [],
    reviewed: true,
    audio: null,
    audioTranslation: null,
    ...overrides,
  }
}

const evening = item('evening', { kind: 'window', window: 'evening' })
const morning = item('morning', { kind: 'window', window: 'morning' }, { defaultOn: true })
const monday = item(
  'monday',
  { kind: 'day', day: 'monday' },
  { category: 'fasting', defaultOn: true },
)

function signals(items: Item[], enabled: string[] = [], known: string[] = []): Signals {
  return {
    now,
    timeZone: toronto.timeZone,
    items,
    prayerTimes: times,
    today: {
      civil: { year: 2026, month: 9, day: 17 },
      hijri: { year: 1448, month: 3, day: 25 },
      hijriCalculated: { year: 1448, month: 3, day: 25 },
      weekday: 4,
    },
    upcoming: [],
    prayedToday: {},
    completedToday: {},
    activeEvents: [],
    userState: { travelling: false, trackingPaused: false },
    preferences: {
      enabledItemIds: enabled,
      knownItemIds: known,
      notifications: DEFAULT_NOTIFICATION_PREFERENCES,
    },
  }
}

describe('what to try next', () => {
  it('prefers the item whose moment this is', () => {
    expect(suggest(signals([morning, evening]), DEFAULT_SUGGESTION, 'settled')).toBe('evening')
  })

  it('never offers what is enabled or known', () => {
    expect(
      suggest(signals([morning, evening], ['evening'], ['morning']), DEFAULT_SUGGESTION, 'settled'),
    ).toBeNull()
  })

  it('holds fasting back while the user is new', () => {
    expect(suggest(signals([monday, morning]), DEFAULT_SUGGESTION, 'early')).toBe('morning')
    expect(suggest(signals([monday, morning]), DEFAULT_SUGGESTION, 'settled')).toBe('monday')
  })

  it('keeps the same offer for a week, then nothing once it is declined', () => {
    const shown = {
      shownAt: new Date(now.getTime() - 86_400_000).toISOString(),
      itemId: 'morning',
      dismissed: [],
    }
    expect(suggest(signals([morning, evening]), shown, 'settled')).toBe('morning')
    expect(
      suggest(signals([morning, evening]), { ...shown, dismissed: ['morning'] }, 'settled'),
    ).toBeNull()
  })

  it('offers again once the week has passed', () => {
    const old = {
      shownAt: new Date(now.getTime() - SUGGESTION_INTERVAL_MS - 1).toISOString(),
      itemId: 'morning',
      dismissed: ['morning'],
    }
    expect(suggest(signals([morning, evening]), old, 'settled')).toBe('evening')
  })
})
