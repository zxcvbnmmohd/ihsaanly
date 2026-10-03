import { describe, expect, it } from 'bun:test'

import type { Item } from '@ihsaanly/core/content/schema'
import { ar } from '@ihsaanly/core/strings/ar'
import { en } from '@ihsaanly/core/strings/en'
import { fr } from '@ihsaanly/core/strings/fr'
import { hi } from '@ihsaanly/core/strings/hi'
import { it as italian } from '@ihsaanly/core/strings/it'
import { ja } from '@ihsaanly/core/strings/ja'
import { so } from '@ihsaanly/core/strings/so'
import { ur } from '@ihsaanly/core/strings/ur'
import { yue } from '@ihsaanly/core/strings/yue'
import { zh } from '@ihsaanly/core/strings/zh'

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
        window: { closes: 'maghrib', endsAt, jumuah: false },
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
        window: { closes: 'maghrib', endsAt, jumuah: false },
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
        window: { closes: 'maghrib', endsAt, jumuah: false },
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
    const content = notificationContent(
      { kind: 'prayer', prayer: 'fajr', at, jumuah: false },
      [item],
      en,
    )
    expect(content?.title).toBe(en.prayer.fajr)
    expect(content?.channelId).toBe('prayers')
    expect(content?.categoryIdentifier).toBeUndefined()
  })

  it("names Jumu'ah, not Dhuhr, when the prayer falls on the user's Jumu'ah day", () => {
    const friday = notificationContent(
      { kind: 'prayer', prayer: 'dhuhr', at, jumuah: true },
      [item],
      en,
    )
    const otherDay = notificationContent(
      { kind: 'prayer', prayer: 'dhuhr', at, jumuah: false },
      [item],
      en,
    )
    expect(friday?.title).toBe("Jumu'ah")
    expect(otherDay?.title).toBe('Dhuhr')
    // The identifier and payload stay dhuhr: Jumu'ah is recorded as the dhuhr mark.
    expect(friday?.identifier).toBe(otherDay?.identifier ?? '')
    expect(friday?.data).toEqual({ v: 1, kind: 'prayer', prayer: 'dhuhr' })
  })

  it("says the morning window is open until Jumu'ah on a Friday", () => {
    const morning: Item = { ...item, id: 'morning-adhkar', reminder: null }
    const content = notificationContent(
      {
        kind: 'item',
        itemId: 'morning-adhkar',
        at,
        reason: 'current-window',
        window: { closes: 'dhuhr', endsAt, jumuah: true },
      },
      [morning],
      en,
    )
    expect(content?.body).toBe("Open until Jumu'ah.")
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

  it('refuses an entry of a kind it was never taught', () => {
    expect(() => notificationContent({ kind: 'mystery' } as never, [item], en)).toThrow()
  })
})

describe('words while paused', () => {
  const remembrance: Item = {
    ...item,
    id: 'remembrance-at-prayer-times',
    title: { en: 'Remembrance at prayer times' },
    trigger: { kind: 'prayer', prayer: 'any', when: 'before' },
    reminder: { en: 'An item sentence that must not be used.' },
    onlyWhilePaused: true,
  }
  const entry = {
    kind: 'remembrance' as const,
    itemId: remembrance.id,
    prayer: 'dhuhr' as const,
    at,
    endsAt,
  }

  it('names only the prayer time and the remembrance, and answers like an item', () => {
    const content = notificationContent(entry, [remembrance], en)
    expect(content).toEqual({
      identifier: `plan:remembrance-at-prayer-times:dhuhr@${at.getTime()}`,
      title: en.prayer.dhuhr,
      body: en.notifications.pausedRemembrance,
      at,
      channelId: 'prayers',
      categoryIdentifier: 'reminder',
      data: {
        v: 1,
        kind: 'item',
        itemId: 'remembrance-at-prayer-times',
        endsAt: endsAt.getTime(),
        reason: 'current-window',
      },
    })
  })

  it('sends the check-in as a bare question that opens Today', () => {
    expect(notificationContent({ kind: 'check-in', at }, [], en)).toEqual({
      identifier: `plan:check-in@${at.getTime()}`,
      title: en.notifications.checkIn,
      body: '',
      at,
      channelId: 'reminders',
      data: { v: 1, kind: 'check-in' },
    })
  })

  it('never says pause, period or why, in any language', () => {
    expect(en.notifications.pausedRemembrance).not.toMatch(/paus|period|menstru|track/i)
    expect(en.notifications.checkIn).not.toMatch(/paus|period|menstru|track/i)

    for (const strings of [en, ar, fr, hi, italian, ja, so, ur, yue, zh]) {
      const shown = [
        notificationContent(entry, [remembrance], strings),
        notificationContent({ kind: 'check-in', at }, [], strings),
      ].flatMap((content) => (content ? [content.title, content.body] : []))
      const telling = [strings.tracking.paused, strings.tracking.pausedDetail]
      shown.forEach((text) => telling.forEach((tell) => expect(text).not.toContain(tell)))
      expect(shown).not.toContain(remembrance.reminder?.en)
    }
  })
})
