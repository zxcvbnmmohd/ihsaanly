import { describe, expect, test } from 'bun:test'
import { plan } from '@ihsaanly/core/plan/plan'
import { en } from '@ihsaanly/core/strings/en'
import { defaultCityFor } from './cities'
import { demoItemById, demoItems } from './demo-content'
import {
  buildItem,
  buildLibrary,
  buildMore,
  buildSignals,
  buildToday,
  DEFAULT_ENABLED,
  shareTextFor,
  toggleMark,
} from './engine'

const strings = en
const place = defaultCityFor('Asia/Riyadh')
// Wednesday 30 September 2026, 13:00 in Makkah (10:00 UTC): inside Dhuhr's window.
const NOON = new Date(Date.UTC(2026, 8, 30, 10, 0))
// A Friday, to see Jumu'ah.
const FRIDAY = new Date(Date.UTC(2026, 9, 2, 10, 0))
const user = { marks: {}, completed: {}, enabled: DEFAULT_ENABLED }

function dayAt(hourUtc: number): Date {
  return new Date(Date.UTC(2026, 8, 30, hourUtc, 0))
}

describe('DEFAULT_ENABLED', () => {
  test('is the ids of the items that are on by default', () => {
    expect(DEFAULT_ENABLED.length).toBeGreaterThan(0)
    expect(DEFAULT_ENABLED).toEqual(
      demoItems()
        .filter((i) => i.defaultOn)
        .map((i) => i.id),
    )
  })
})

describe('toggleMark', () => {
  test('marks, then unmarks, without touching the input', () => {
    const marked = toggleMark({}, 'fajr', NOON)
    expect(marked).toEqual({ fajr: NOON })
    expect(toggleMark(marked, 'fajr', NOON)).toEqual({})
    expect(marked).toEqual({ fajr: NOON })
  })
})

describe('buildSignals', () => {
  test("is the app's own signals for the instant, place and user", () => {
    const signals = buildSignals(place, NOON, user)
    expect(signals.now).toBe(NOON)
    expect(signals.timeZone).toBe('Asia/Riyadh')
    expect(signals.prayerTimes).toHaveLength(3)
    expect(signals.upcoming).toHaveLength(7)
    expect(signals.preferences.enabledItemIds).toBe(DEFAULT_ENABLED)
    expect(signals.items).toBe(demoItems())
  })

  test('keeps only marks made on the same civil day', () => {
    const signals = buildSignals(place, NOON, {
      ...user,
      marks: { fajr: dayAt(2), dhuhr: new Date(Date.UTC(2026, 8, 29, 9)) },
      completed: { 'dua-travel': dayAt(3) },
    })
    expect(Object.keys(signals.prayedToday)).toEqual(['fajr'])
    expect(Object.keys(signals.completedToday)).toEqual(['dua-travel'])
  })
})

describe('buildToday', () => {
  test('midday: Dhuhr is current, earlier prayers have passed, none is done', () => {
    const today = buildToday(buildSignals(place, NOON, user), strings, 'en-US', 'Makkah')
    expect(today.currentPrayer).toBe('dhuhr')
    expect(today.title).toContain(today.names.dhuhr)
    expect(today.props.placeLabel).toBe('Makkah')
    expect(today.props.hasLocation).toBe(true)
    expect(today.props.gregorian).toBe('Wed, Sep 30')
    const status = Object.fromEntries(today.props.prayers.map((p) => [p.prayer, p]))
    expect(status.fajr?.passed).toBe(true)
    expect(status.dhuhr?.passed).toBe(false)
    expect(status.asr?.passed).toBe(false)
    expect(today.props.prayers.every((p) => !p.done)).toBe(true)
  })

  test('a prayer marked today shows as done', () => {
    const signals = buildSignals(place, NOON, { ...user, marks: { fajr: dayAt(2) } })
    const today = buildToday(signals, strings, 'en-US', 'Makkah')
    expect(today.props.prayers.find((p) => p.prayer === 'fajr')?.done).toBe(true)
  })

  test("on a Friday the midday prayer is Jumu'ah", () => {
    const today = buildToday(buildSignals(place, FRIDAY, user), strings, 'en-US', 'Makkah')
    expect(today.props.jumuah).toBe(true)
    expect(today.names.dhuhr).not.toBe(
      buildToday(buildSignals(place, NOON, user), strings, 'en-US', 'Makkah').names.dhuhr,
    )
  })

  test('at sunrise no prayer is current', () => {
    // Sunrise in Makkah at the end of September is about 06:00 local (03:00 UTC).
    const today = buildToday(
      buildSignals(place, new Date(Date.UTC(2026, 8, 30, 3, 20)), user),
      strings,
      'en-US',
      'Makkah',
    )
    expect(today.currentPrayer).toBeNull()
    expect(today.title).toBeTruthy()
  })

  test("the evening before, tomorrow's items are listed with their days", () => {
    const evening = new Date(Date.UTC(2026, 9, 1, 10, 0))
    const { props } = buildToday(buildSignals(place, evening, user), strings, 'en-US', 'Makkah')
    expect(props.tomorrow.length).toBeGreaterThan(0)
    expect(props.allDay).toEqual([])
  })

  test('groups what is coming into now, all-day, tomorrow and later', () => {
    const { props } = buildToday(buildSignals(place, NOON, user), strings, 'en-US', 'Makkah')
    expect(Array.isArray(props.now)).toBe(true)
    expect(Array.isArray(props.allDay)).toBe(true)
    expect(
      props.tomorrow.length + props.later.length + props.allDay.length + props.now.length,
    ).toBeGreaterThan(0)
    expect(props.qada).toEqual([])
    expect(props.fastsOwed).toBe(0)
  })
})

describe('buildLibrary', () => {
  const all = demoItems()

  test('no query lists every item under its category, sorted by category label', () => {
    const library = buildLibrary('', 'all', DEFAULT_ENABLED, strings)
    expect(library.counts).toEqual({
      all: all.length,
      onToday: DEFAULT_ENABLED.length,
      known: 0,
    })
    const total = library.sections.reduce((sum, section) => sum + section.entries.length, 0)
    expect(total).toBe(all.length)
    const labels = library.sections.map((s) => strings.category[s.category] ?? s.category)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)))
    const first = library.sections[0]?.entries[0]
    expect(first?.href).toBe(`/item/${first?.id}`)
    expect(first?.known).toBe(false)
  })

  test('a query narrows the list', () => {
    const library = buildLibrary('siwak', 'all', DEFAULT_ENABLED, strings)
    expect(library.counts.all).toBeLessThan(all.length)
    expect(library.sections.flatMap((s) => s.entries).some((e) => e.id.includes('siwak'))).toBe(
      true,
    )
  })

  test('the "on Today" filter keeps only enabled items', () => {
    const library = buildLibrary('', 'onToday', ['dua-travel'], strings)
    const entries = library.sections.flatMap((s) => s.entries)
    expect(entries.every((entry) => entry.onToday)).toBe(true)
    expect(library.counts.onToday).toBe(1)
  })

  test('a category with no label shows under its id', () => {
    const odd = { ...strings, category: {} }
    const library = buildLibrary('', 'all', [], odd)
    expect(library.sections.length).toBeGreaterThan(0)
  })
})

describe('buildItem', () => {
  const signals = buildSignals(place, NOON, user)
  const input = { signals, count: 0, remind: {}, enabled: DEFAULT_ENABLED }

  test('without an item it is the not-found screen', () => {
    const missing = buildItem({ ...input, id: null }, strings)
    expect(missing.item).toBeNull()
    expect(missing.title).toBe(strings.notFound.title)
    expect(missing.counter).toBeNull()
    expect(buildItem({ ...input, id: 'nope' }, strings).item).toBeNull()
  })

  test('an item has its text, evidence, parts and links', () => {
    const withParts = demoItems().find((item) => (item.parts ?? []).length > 0)
    const withoutParts = demoItems().find((item) => (item.parts ?? []).length === 0)
    if (!withParts || !withoutParts) throw new Error('content fixture')
    const detailed = buildItem({ ...input, id: withParts.id }, strings)
    expect(detailed.item?.parts.length).toBe(withParts.parts?.length ?? 0)
    expect(detailed.item?.parts[0]?.source).toBeTruthy()
    expect(buildItem({ ...input, id: withoutParts.id }, strings).item?.parts).toEqual([])
    expect(detailed.item?.rulingHref).toBe(`/glossary?term=${withParts.ruling}`)
    expect(detailed.onToday).toBe(DEFAULT_ENABLED.includes(withParts.id))
  })

  test('only items said more than once get a counter, starting from the count', () => {
    const repeated = demoItems().find((item) => item.repeat > 1)
    const once = demoItems().find((item) => item.repeat <= 1)
    if (!repeated || !once) throw new Error('content fixture')
    expect(buildItem({ ...input, id: repeated.id, count: 2 }, strings).counter).toEqual({
      count: 2,
      target: repeated.repeat,
    })
    expect(buildItem({ ...input, id: once.id }, strings).counter).toBeNull()
  })

  test('memorise link only for items with Arabic', () => {
    const arabic = demoItems().find((item) => item.arabic)
    const plainItem = demoItems().find((item) => !item.arabic)
    if (!arabic || !plainItem) throw new Error('content fixture')
    expect(buildItem({ ...input, id: arabic.id }, strings).memoriseHref).toBe(
      `/item/memorise/${arabic.id}`,
    )
    expect(buildItem({ ...input, id: plainItem.id }, strings).memoriseHref).toBeNull()
  })

  test('done once completed today, unless the item is open again in the plan', () => {
    const closed = demoItems().find((item) => !item.defaultOn)
    if (!closed) throw new Error('content fixture')
    const done = buildSignals(place, NOON, { ...user, completed: { [closed.id]: dayAt(3) } })
    expect(buildItem({ ...input, signals: done, id: closed.id }, strings).done).toBe(true)
    expect(buildItem({ ...input, id: closed.id }, strings).done).toBe(false)
    const open = plan(signals).today.now[0]
    if (!open) throw new Error('expected an item open at midday')
    const marked = buildSignals(place, NOON, { ...user, completed: { [open.itemId]: dayAt(3) } })
    expect(buildItem({ ...input, signals: marked, id: open.itemId }, strings).done).toBe(false)
  })
})

describe('buildMore', () => {
  test("lists the app's More groups at first-launch defaults", () => {
    const groups = buildMore(strings, 'en', 'Makkah')
    expect(groups.length).toBeGreaterThan(0)
    expect(JSON.stringify(groups)).toContain('Makkah')
  })
})

describe('shareTextFor', () => {
  test('is the text the app shares, or null for an unknown item', () => {
    const [first] = demoItems()
    if (!first) throw new Error('content fixture')
    expect(shareTextFor(first.id, strings)).toContain(first.arabic ?? first.id)
    expect(shareTextFor('nope', strings)).toBeNull()
    expect(demoItemById(first.id)).toBe(first)
  })
})

describe('buildToday: circles, done and panels', () => {
  const build = (
    signals = buildSignals(place, NOON, user),
    view?: Parameters<typeof buildToday>[4],
  ): ReturnType<typeof buildToday> => buildToday(signals, strings, 'en-US', 'Makkah', view)

  test('open rows get a circle, and the demo opts out of the app-only extras', () => {
    const { props } = build()
    const marks = [...props.now, ...props.allDay].map((entry) => entry.mark)
    expect(marks.length).toBeGreaterThan(0)
    expect(marks.every((mark) => mark !== null && !mark.done)).toBe(true)
    expect(props.tomorrow.concat(props.later).every((entry) => entry.mark === null)).toBe(true)
    expect(props.tour).toBeNull()
    expect(props.paused).toBe(false)
    expect(props.checkIn).toBeNull()
    expect(props.prayerHint).toBe(false)
    expect(props.undo).toBeNull()
    expect(props.panel).toBeNull()
  })

  test('a completed item moves to Done today with a done circle', () => {
    const open = build().props.now[0]?.id ?? ''
    const { props } = build(buildSignals(place, NOON, { ...user, completed: { [open]: NOON } }))
    expect(props.now.map((entry) => entry.id)).not.toContain(open)
    expect(props.doneToday.map((entry) => entry.id)).toContain(open)
    expect(props.doneToday.every((entry) => entry.mark?.done === true)).toBe(true)
  })

  test("a counted item's ring shows its taps, and its panel is the counter", () => {
    const signals = buildSignals(place, NOON, { ...user, marks: { dhuhr: NOON } })
    const view = {
      progress: { 'tasbih-after-prayer': { count: 5, parts: [] } },
      panelItemId: 'tasbih-after-prayer',
    }
    const { props } = build(signals, view)
    const row = [...props.now, ...props.allDay, ...(props.next?.after ?? [])].find(
      (entry) => entry.id === 'tasbih-after-prayer',
    )
    expect(row?.mark?.progress).toEqual({ kind: 'count', value: 5, total: 33 })
    expect(props.panel).toMatchObject({ kind: 'count', count: 5, target: 33 })
  })

  test('the next prayer card rows carry circles too', () => {
    const next = build().props.next
    for (const entry of [...(next?.before ?? []), ...(next?.after ?? [])]) {
      expect(entry.mark).not.toBeNull()
    }
  })
})
