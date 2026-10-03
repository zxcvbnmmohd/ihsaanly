import { describe, expect, it } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import type { PlannedItem } from '@ihsaanly/core/plan/signals'
import { en } from '@ihsaanly/core/strings/en'
import {
  caveatLabel,
  detailFor,
  distanceLabel,
  itemEntry,
  markFor,
  markKind,
  onMakeUpFor,
  panelFor,
  soonestEach,
  split,
  toEntry,
  toNext,
  whenLabel,
} from './today'

const planned = (overrides: Partial<PlannedItem>): PlannedItem => ({
  itemId: 'evening-adhkar',
  reason: 'today',
  ...overrides,
})

describe('caveatLabel', () => {
  it('names the caveat', () => {
    expect(caveatLabel('expected', en)).toBe(en.plan.expected)
    expect(caveatLabel('confirm-locally', en)).toBe(en.plan.confirmLocally)
  })

  it('is silent otherwise', () => {
    expect(caveatLabel(undefined, en)).toBeNull()
  })
})

describe('whenLabel', () => {
  it('is silent for a today entry', () => {
    expect(whenLabel(planned({ reason: 'today' }), en)).toBeNull()
  })

  it('says tomorrow for one day away', () => {
    expect(whenLabel(planned({ reason: 'upcoming', daysAway: 1 }), en)).toBe(en.plan.tomorrow)
  })

  it('counts further-out days', () => {
    expect(whenLabel(planned({ reason: 'upcoming', daysAway: 3 }), en)).toBe(en.plan.inDays(3))
  })
})

describe('detailFor', () => {
  it('joins whichever parts apply', () => {
    const entry = planned({ reason: 'upcoming', daysAway: 3, optional: true, caveat: 'expected' })
    expect(detailFor(entry, en, true)).toBe(
      [en.plan.inDays(3), en.plan.optional, en.plan.expected].join(' · '),
    )
  })

  it('is null when nothing applies', () => {
    expect(detailFor(planned({ reason: 'today' }), en, true)).toBeNull()
  })

  it('hides the when part when asked', () => {
    const entry = planned({ reason: 'upcoming', daysAway: 1, optional: true })
    expect(detailFor(entry, en, false)).toBe(en.plan.optional)
  })
})

describe('distanceLabel', () => {
  it('picks the bracket the minutes fall in', () => {
    expect(distanceLabel(10, en)).toBe(en.plan.soon)
    expect(distanceLabel(60, en)).toBe(en.plan.inAboutAnHour)
    expect(distanceLabel(180, en)).toBe(en.plan.inAboutHours(3))
  })
})

describe('itemEntry', () => {
  it('resolves a known item', () => {
    const entry = itemEntry('evening-adhkar', itemById)
    expect(entry?.id).toBe('evening-adhkar')
    expect(entry?.href).toBe('/item/evening-adhkar')
  })

  it('is null for an unknown id', () => {
    expect(itemEntry('does-not-exist', itemById)).toBeNull()
  })
})

describe('toEntry', () => {
  it('is null when the item cannot be found', () => {
    expect(toEntry(planned({ itemId: 'does-not-exist' }), en, itemById)).toBeNull()
  })

  it('carries the planned item detail through', () => {
    const entry = toEntry(
      planned({ itemId: 'evening-adhkar', reason: 'upcoming', daysAway: 1 }),
      en,
      itemById,
    )
    expect(entry?.detail).toBe(en.plan.tomorrow)
  })
})

describe('toNext', () => {
  it('is null with no next prayer', () => {
    expect(toNext(null, new Date(), en, itemById)).toBeNull()
  })

  it('resolves the before/after item lists', () => {
    const now = new Date('2026-09-23T12:00:00Z')
    const startsAt = new Date('2026-09-23T13:00:00Z')
    const entry = toNext(
      {
        prayer: 'dhuhr',
        jumuah: false,
        startsAt,
        before: ['does-not-exist'],
        after: ['evening-adhkar'],
      },
      now,
      en,
      itemById,
    )
    expect(entry?.before).toEqual([])
    expect(entry?.after).toHaveLength(1)
    expect(entry?.distance).toBe(en.plan.inAboutAnHour)
  })
})

describe('split', () => {
  it('separates today, tomorrow and later, deduplicating repeats', () => {
    const entries: PlannedItem[] = [
      planned({ itemId: 'a', reason: 'today' }),
      planned({ itemId: 'b', reason: 'upcoming', daysAway: 1 }),
      planned({ itemId: 'c', reason: 'upcoming', daysAway: 5 }),
      planned({ itemId: 'c', reason: 'upcoming', daysAway: 3 }),
    ]
    const result = split(entries)
    expect(result.allDay.map((e) => e.itemId)).toEqual(['a'])
    expect(result.tomorrow.map((e) => e.itemId)).toEqual(['b'])
    expect(result.later).toEqual([planned({ itemId: 'c', reason: 'upcoming', daysAway: 3 })])
  })
})

describe('soonestEach', () => {
  it('keeps only the closest occurrence of a repeated item', () => {
    const entries: PlannedItem[] = [
      planned({ itemId: 'fast-white-days', reason: 'upcoming', daysAway: 5 }),
      planned({ itemId: 'fast-white-days', reason: 'upcoming', daysAway: 2 }),
    ]
    expect(soonestEach(entries)).toEqual([
      planned({ itemId: 'fast-white-days', reason: 'upcoming', daysAway: 2 }),
    ])
  })

  it('lists different items soonest first', () => {
    const entries: PlannedItem[] = [
      planned({ itemId: 'fast-monday', reason: 'upcoming', daysAway: 4 }),
      planned({ itemId: 'fast-white-days', reason: 'upcoming', daysAway: 2 }),
      planned({ itemId: 'fast-thursday', reason: 'upcoming' }),
    ]
    expect(soonestEach(entries).map((entry) => entry.itemId)).toEqual([
      'fast-thursday',
      'fast-white-days',
      'fast-monday',
    ])
  })
})

describe('onMakeUpFor', () => {
  const now = new Date('2026-09-23T12:00:00Z')

  it('records the prayer once the time zone is known', () => {
    const calls: unknown[][] = []
    onMakeUpFor('America/Toronto', now, (...args) => calls.push(args))('asr')
    expect(calls).toEqual([['asr', now, 'America/Toronto']])
  })

  it('records nothing without a time zone', () => {
    const calls: unknown[][] = []
    onMakeUpFor(undefined, now, (...args) => calls.push(args))('asr')
    expect(calls).toEqual([])
  })
})

describe('marks and panels', () => {
  const tasbih = itemById('tasbih-after-prayer')
  const adhkar = itemById('morning-adhkar')
  const witr = { repeat: 1 }
  if (!tasbih || !adhkar) throw new Error('content changed')
  const none = { count: 0, parts: [] }

  it('tells how an item is done', () => {
    expect(markKind(witr)).toBe('once')
    expect(markKind(tasbih)).toBe('count')
    expect(markKind(adhkar)).toBe('parts')
  })

  it('draws a plain circle for an item done in one go, or one that is done', () => {
    expect(markFor(witr, false, none)).toEqual({ done: false, progress: null })
    expect(markFor(tasbih, true, { count: 12, parts: [] })).toEqual({ done: true, progress: null })
  })

  it('draws a ring of the count or of the parts said', () => {
    expect(markFor(tasbih, false, { count: 12, parts: [] }).progress).toEqual({
      kind: 'count',
      value: 12,
      total: 33,
    })
    const first = adhkar.parts?.[0]?.id ?? ''
    expect(markFor(adhkar, false, { count: 0, parts: [first, 'gone'] }).progress).toEqual({
      kind: 'parts',
      value: 1,
      total: adhkar.parts?.length ?? 0,
    })
  })

  it('opens the counter or the checklist, and nothing for an item done in one go', () => {
    expect(panelFor(tasbih, { count: 5, parts: [] })).toMatchObject({
      kind: 'count',
      itemId: 'tasbih-after-prayer',
      count: 5,
      target: 33,
    })
    const first = adhkar.parts?.[0]?.id ?? ''
    const panel = panelFor(adhkar, { count: 0, parts: [first] })
    expect(panel?.kind).toBe('parts')
    expect(panel?.kind === 'parts' ? panel.parts.filter((part) => part.done) : []).toHaveLength(1)
    const once = itemById('witr')
    if (!once) throw new Error('content changed')
    expect(panelFor(once, none)).toBeNull()
  })

  it('falls back to ids where content carries no title in this language', () => {
    const bare = {
      ...adhkar,
      title: {},
      parts: (adhkar.parts ?? []).map((part) => ({ ...part, title: {} })),
    } as unknown as typeof adhkar
    const panel = panelFor(bare, none)
    expect(panel?.title).toBe('morning-adhkar')
    expect(panel?.kind === 'parts' ? panel.parts[0]?.title : null).toBe(adhkar.parts?.[0]?.id)
  })
})
