import { describe, expect, it } from 'bun:test'

import type { Item } from '@/content/schema'
import { en } from '@/strings/en'

import { notificationContent } from './content'

const at = new Date('2026-09-21T05:00:00Z')
const endsAt = new Date('2026-09-21T11:00:00Z')

const item: Item = {
  id: 'evening-adhkar',
  category: 'adhkar',
  title: { en: 'Evening adhkar' },
  ruling: 'sunnah',
  arabic: null,
  transliteration: null,
  translation: null,
  repeat: 1,
  evidence: [],
  trigger: { kind: 'window', window: 'evening' },
  defaultOn: true,
  note: null,
  why: null,
  reminder: null,
  how: [],
  reviewed: true,
  audio: null,
  audioTranslation: null,
}

describe('notification words', () => {
  it("prefers the item's own sentence over the status line", () => {
    const teaching: Item = {
      ...item,
      reminder: { en: 'The evening remembrance, from Asr until the light goes.' },
    }
    const content = notificationContent(
      {
        kind: 'item',
        itemId: 'evening-adhkar',
        at,
        reason: 'current-window',
        window: { closes: 'maghrib', endsAt },
      },
      [teaching],
      en,
    )

    expect(content?.body).toBe('The evening remembrance, from Asr until the light goes.')
  })

  it('falls back to the status line for a language the content lacks', () => {
    // resolveText returns null rather than English, so an Arabic reader gets
    // interface copy instead of a sentence they cannot read.
    const englishOnly: Item = { ...item, reminder: null }
    const content = notificationContent(
      {
        kind: 'item',
        itemId: 'evening-adhkar',
        at,
        reason: 'current-window',
        window: { closes: 'maghrib', endsAt },
      },
      [englishOnly],
      en,
    )

    expect(content?.body).toBe(en.notifications.body.windowUntil(en.prayer.maghrib))
  })

  it('says until which prayer a window is open', () => {
    const content = notificationContent(
      {
        kind: 'item',
        itemId: 'evening-adhkar',
        at,
        reason: 'current-window',
        window: { closes: 'maghrib', endsAt },
      },
      [item],
      en,
    )
    expect(content?.title).toBe('Evening adhkar')
    expect(content?.body).toBe(en.notifications.body.windowUntil(en.prayer.maghrib))
    expect(content?.data).toEqual({
      v: 1,
      kind: 'item',
      itemId: 'evening-adhkar',
      endsAt: endsAt.getTime(),
      reason: 'current-window',
    })
    expect(content?.identifier).toBe(`plan:evening-adhkar@${at.getTime()}`)
  })

  it('says tomorrow for the look-ahead', () => {
    const content = notificationContent(
      { kind: 'item', itemId: 'evening-adhkar', at, reason: 'upcoming', window: null },
      [item],
      en,
    )
    expect(content?.body).toBe(en.notifications.body.tomorrow)
  })

  it('names the prayer on its own channel', () => {
    const content = notificationContent({ kind: 'prayer', prayer: 'fajr', at }, [item], en)
    expect(content?.title).toBe(en.prayer.fajr)
    expect(content?.channelId).toBe('prayers')
    expect(content?.categoryIdentifier).toBeUndefined()
  })

  it('returns nothing for an unknown item', () => {
    expect(
      notificationContent(
        { kind: 'item', itemId: 'gone', at, reason: 'current-window', window: null },
        [item],
        en,
      ),
    ).toBeNull()
  })
})
