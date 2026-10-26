import { describe, expect, it } from 'bun:test'
import { items } from '@ihsaanly/core/content'
import type { Item } from '@ihsaanly/core/content/schema'
import type { Plan, TodayModel } from '@ihsaanly/core/plan/signals'
import { en } from '@ihsaanly/core/strings/en'
import { reminderPreview, SOURCED_ITEM, sourcedExample, widgetPreview } from './previews'

const now = new Date('2026-09-21T13:00:00Z')

function today(over: Partial<TodayModel> = {}): TodayModel {
  return {
    hijri: { year: 1448, month: 3, day: 9 },
    window: null,
    jumuah: false,
    now: [],
    done: [],
    rightNow: null,
    context: [],
    comingUp: [],
    next: null,
    pausedNotice: null,
    checkInDue: false,
    ...over,
  } as TodayModel
}

function planned(over: Partial<Plan> = {}): Plan {
  return { today: today(), notifications: [], ...over }
}

const byId = (id: string): Item => {
  const found = items.find((item) => item.id === id)
  if (!found) throw new Error(`no ${id}`)
  return found
}

const titleOf = (id: string): string => byId(id).title.en ?? id

describe('sourcedExample', () => {
  it('lays out the usual item', () => {
    expect(sourcedExample(items)?.title).toBe(titleOf(SOURCED_ITEM))
  })

  it('falls back to the first item citing a hadith when the usual one is gone', () => {
    const rest = items.filter((item) => item.id !== SOURCED_ITEM)
    const first = rest.find((item) => item.evidence.some((entry) => entry.type === 'hadith'))
    expect(sourcedExample(rest)?.title).toBe(first?.title.en)
  })

  it('has nothing to show without a hadith anywhere', () => {
    const quranOnly = items.filter((item) => item.evidence.every((entry) => entry.type === 'quran'))
    expect(sourcedExample(quranOnly)).toBeNull()
  })
})

describe('reminderPreview', () => {
  it('prefers a reminder inside a window to the look-ahead', () => {
    const preview = reminderPreview(
      planned({
        notifications: [
          { kind: 'item', itemId: 'fast-monday', at: now, reason: 'upcoming', window: null },
          {
            kind: 'item',
            itemId: 'evening-adhkar',
            at: now,
            reason: 'current-window',
            window: { closes: 'maghrib', endsAt: now, jumuah: false },
          },
          { kind: 'prayer', prayer: 'asr', jumuah: false, at: now, endsAt: now },
        ],
      }),
      items,
      en,
      now,
    )
    expect(preview.item.title).toBe(titleOf('evening-adhkar'))
    expect(preview.prayer).toEqual({
      title: en.notifications.prayerArrived('Asr'),
      body: en.notifications.prayerAsk.asr,
    })
  })

  it('takes the look-ahead when it is all there is', () => {
    const preview = reminderPreview(
      planned({
        notifications: [
          { kind: 'item', itemId: 'fast-monday', at: now, reason: 'upcoming', window: null },
        ],
      }),
      items,
      en,
      now,
    )
    expect(preview.item.title).toBe(titleOf('fast-monday'))
  })

  it('with nothing scheduled, words what is on now and the next prayer', () => {
    const preview = reminderPreview(
      planned({
        today: today({
          rightNow: { itemId: 'tasbih-after-prayer', reason: 'after-prayer' },
          next: { prayer: 'dhuhr', jumuah: true, startsAt: now, before: [], after: [] },
        }),
      }),
      items,
      en,
      now,
    )
    expect(preview.item.title).toBe(titleOf('tasbih-after-prayer'))
    expect(preview.prayer.body).toBe(en.notifications.prayerAsk.jumuah)
  })

  it('with nothing at all, still has something true to show', () => {
    const preview = reminderPreview(planned(), [], en, now)
    expect(preview.item).toEqual({
      title: en.notifications.testTitle,
      body: en.notifications.testBody,
    })
    expect(preview.prayer.title).toBe(en.notifications.prayerArrived('Asr'))
  })
})

describe('widgetPreview', () => {
  it("shows the window's headline and the distance to the next prayer", () => {
    const preview = widgetPreview(
      planned({
        today: today({
          window: 'asr',
          rightNow: { itemId: 'evening-adhkar', reason: 'current-window' },
          next: {
            prayer: 'maghrib',
            jumuah: false,
            startsAt: new Date(now.getTime() + 150 * 60_000),
            before: [],
            after: [],
          },
        }),
      }),
      items,
      en,
      now,
    )
    expect(preview.home).toEqual({
      caption: en.window.asr,
      title: titleOf('evening-adhkar'),
      detail: byId('evening-adhkar').reminder?.en ?? null,
    })
    expect(preview.lock).toEqual({ title: 'Maghrib', detail: en.plan.inAboutHours(3) })
  })

  it('says nothing is asked when nothing is, and falls back without a next prayer', () => {
    const preview = widgetPreview(planned(), items, en, now)
    expect(preview.home).toEqual({
      caption: en.plan.rightNow,
      title: en.widgets.nothingNow,
      detail: null,
    })
    expect(preview.lock).toEqual({ title: en.plan.rightNow, detail: en.widgets.nothingNow })
  })
})
