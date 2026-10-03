import { beforeAll, describe, expect, it } from 'bun:test'
import type { ReactElement } from 'react'

import {
  clicks,
  info,
  installWidgetMocks,
  model,
  type Node,
  nodes,
  texts,
  tree,
} from '../../../test/widgets'
import type { WidgetLink, WidgetModel } from '../model'
import { WIDGET_NAMES, type WidgetName } from '../names'

installWidgetMocks()
// Query-suffixed: publish.android.test replaces './render' for the whole run.
const renderFile = './render.tsx?actual'
const { representation }: typeof import('./render') = await import(renderFile)
const parts = await import('./parts')

beforeAll(() => installWidgetMocks())

type Name = WidgetName
type Shape = 'square' | 'strip' | 'medium' | 'large'
interface Drawn {
  texts: string[]
  uris: (string | null)[]
}

const SIZES: Record<Shape, [number, number]> = {
  square: [110, 110],
  strip: [300, 70],
  medium: [250, 150],
  large: [250, 300],
}
const SHAPES = Object.keys(SIZES) as Shape[]

const EXPECTED: Record<Name, Record<Shape, Drawn>> = {
  RightNowWidget: {
    square: { texts: ['Morning', 'Morning adhkar'], uris: ['ihsaanly://item/morning-adhkar'] },
    strip: { texts: ['Morning', 'Morning adhkar'], uris: ['ihsaanly://item/morning-adhkar'] },
    medium: { texts: ['Morning', 'Morning adhkar'], uris: ['ihsaanly://item/morning-adhkar'] },
    large: { texts: ['Morning', 'Morning adhkar'], uris: ['ihsaanly://item/morning-adhkar'] },
  },
  NextPrayerWidget: {
    square: { texts: ['Up next', 'Dhuhr', 'In about 3 hours'], uris: [] },
    strip: { texts: ['Up next', 'Dhuhr', 'In about 3 hours'], uris: [] },
    medium: {
      texts: [
        'Up next',
        'Dhuhr',
        'In about 3 hours',
        'Before · Two or four rak’ah before Dhuhr',
        'After · Tasbih after prayer',
      ],
      uris: ['ihsaanly://item/sunnah-before-dhuhr', 'ihsaanly://item/tasbih-after-prayer'],
    },
    large: {
      texts: [
        'Up next',
        'Dhuhr',
        'In about 3 hours',
        'Before · Two or four rak’ah before Dhuhr',
        'After · Tasbih after prayer',
        'After · Two rak’ah after Dhuhr',
      ],
      uris: [
        'ihsaanly://item/sunnah-before-dhuhr',
        'ihsaanly://item/tasbih-after-prayer',
        'ihsaanly://item/sunnah-after-dhuhr',
      ],
    },
  },
  PrayersWidget: {
    square: { texts: ['Prayers', 'F', 'D', 'A', 'M', 'I'], uris: [] },
    strip: { texts: ['F', 'D', 'A', 'M', 'I'], uris: [] },
    medium: {
      texts: ['Prayers', 'F', 'Fajr', 'D', 'Dhuhr', 'A', 'Asr', 'M', 'Maghrib', 'I', 'Isha'],
      uris: [],
    },
    large: {
      texts: [
        'Prayers',
        'F',
        'Fajr',
        'D',
        'Dhuhr',
        'A',
        'Asr',
        'M',
        'Maghrib',
        'I',
        'Isha',
        '12 Rabi’ ath-Thani 1448',
      ],
      uris: [],
    },
  },
  HijriDateWidget: {
    square: { texts: ['12 Rabi’ ath-Thani 1448', 'Wed 23 Sep'], uris: ['ihsaanly://hijri'] },
    strip: { texts: ['12 Rabi’ ath-Thani 1448', 'Wed 23 Sep'], uris: ['ihsaanly://hijri'] },
    medium: {
      texts: ['Hijri date', '12 Rabi’ ath-Thani 1448', 'Wed 23 Sep · London'],
      uris: ['ihsaanly://hijri'],
    },
    large: {
      texts: ['Hijri date', '12 Rabi’ ath-Thani 1448', 'Wed 23 Sep', 'London', 'Morning'],
      uris: ['ihsaanly://hijri'],
    },
  },
  UpNextWidget: {
    square: {
      texts: ['Up next · Dhuhr', 'Before · Two or four rak’ah before Dhuhr'],
      uris: ['ihsaanly://item/sunnah-before-dhuhr'],
    },
    strip: {
      texts: ['Up next · Dhuhr', 'Before · Two or four rak’ah before Dhuhr'],
      uris: ['ihsaanly://item/sunnah-before-dhuhr'],
    },
    medium: {
      texts: [
        'Up next · Dhuhr',
        'Before · Two or four rak’ah before Dhuhr',
        'After · Tasbih after prayer',
        'After · Two rak’ah after Dhuhr',
      ],
      uris: [
        'ihsaanly://item/sunnah-before-dhuhr',
        'ihsaanly://item/tasbih-after-prayer',
        'ihsaanly://item/sunnah-after-dhuhr',
      ],
    },
    large: {
      texts: [
        'Up next · Dhuhr',
        'Before · Two or four rak’ah before Dhuhr',
        'After · Tasbih after prayer',
        'After · Two rak’ah after Dhuhr',
        'In about 3 hours',
      ],
      uris: [
        'ihsaanly://item/sunnah-before-dhuhr',
        'ihsaanly://item/tasbih-after-prayer',
        'ihsaanly://item/sunnah-after-dhuhr',
      ],
    },
  },
  AlsoTodayWidget: {
    square: { texts: ['Also today', 'Nothing asked of you right now'], uris: [] },
    strip: { texts: ['Also today', 'Nothing asked of you right now'], uris: [] },
    medium: { texts: ['Also today', 'Nothing asked of you right now'], uris: [] },
    large: { texts: ['Also today', 'Nothing asked of you right now'], uris: [] },
  },
  QuickDuasWidget: {
    square: { texts: ['Quick duas', 'Leaving home'], uris: ['ihsaanly://item/dua-leaving-home'] },
    strip: {
      texts: ['Quick duas', 'Leaving home', 'Setting out on a journey'],
      uris: ['ihsaanly://item/dua-leaving-home', 'ihsaanly://item/dua-travel'],
    },
    medium: {
      texts: [
        'Quick duas',
        'Leaving home',
        'Setting out on a journey',
        'Shortening the prayer',
        'Going up',
        'Going down',
      ],
      uris: [
        'ihsaanly://item/dua-leaving-home',
        'ihsaanly://item/dua-travel',
        'ihsaanly://item/qasr-while-travelling',
        'ihsaanly://item/takbir-ascending',
        'ihsaanly://item/tasbih-descending',
      ],
    },
    large: {
      texts: [
        'Quick duas',
        'Leaving home',
        'Setting out on a journey',
        'Shortening the prayer',
        'Going up',
        'Going down',
      ],
      uris: [
        'ihsaanly://item/dua-leaving-home',
        'ihsaanly://item/dua-travel',
        'ihsaanly://item/qasr-while-travelling',
        'ihsaanly://item/takbir-ascending',
        'ihsaanly://item/tasbih-descending',
      ],
    },
  },
  DuaOfTheDayWidget: {
    square: { texts: ['سُبْحَانَ اللَّهِ'], uris: ['ihsaanly://item/tasbih-after-prayer'] },
    strip: { texts: ['سُبْحَانَ اللَّهِ'], uris: ['ihsaanly://item/tasbih-after-prayer'] },
    medium: {
      texts: ['Tasbih after prayer', 'سُبْحَانَ اللَّهِ'],
      uris: ['ihsaanly://item/tasbih-after-prayer'],
    },
    large: {
      texts: ['Tasbih after prayer', 'سُبْحَانَ اللَّهِ', 'Glory be to Allah.'],
      uris: ['ihsaanly://item/tasbih-after-prayer'],
    },
  },
  MakeUpWidget: {
    square: { texts: ['To make up', '1 prayer owed'], uris: ['ihsaanly://qada'] },
    strip: { texts: ['To make up', '1 prayer owed'], uris: ['ihsaanly://qada'] },
    medium: { texts: ['To make up', '1 prayer owed'], uris: ['ihsaanly://qada'] },
    large: {
      texts: ['To make up', '1 prayer owed', '12 Rabi’ ath-Thani 1448'],
      uris: ['ihsaanly://qada'],
    },
  },
  ComingUpWidget: {
    square: {
      texts: ['Later this week', 'Surah al-Kahf on Friday', 'In 2 days'],
      uris: ['ihsaanly://item/kahf-friday'],
    },
    strip: {
      texts: ['Later this week', 'Surah al-Kahf on Friday', 'In 2 days'],
      uris: ['ihsaanly://item/kahf-friday'],
    },
    medium: {
      texts: [
        'Later this week',
        'Surah al-Kahf on Friday',
        'In 2 days',
        'Abundant salawat on the Prophet ﷺ',
        'In 2 days',
      ],
      uris: ['ihsaanly://item/kahf-friday', 'ihsaanly://item/salawat-friday'],
    },
    large: {
      texts: [
        'Later this week',
        'Surah al-Kahf on Friday',
        'In 2 days',
        'Abundant salawat on the Prophet ﷺ',
        'In 2 days',
      ],
      uris: ['ihsaanly://item/kahf-friday', 'ihsaanly://item/salawat-friday'],
    },
  },
}

function both(
  name: string,
  entry: WidgetModel,
  [width, height]: [number, number],
): { light: ReactElement; dark: ReactElement } {
  const drawn = representation(info(name, width, height), entry)
  if (!('light' in drawn) || !drawn.dark) throw new Error('expected a light and a dark tree')
  return { light: drawn.light, dark: drawn.dark }
}

function light(name: string, entry: WidgetModel, shape: Shape | [number, number]): Node {
  const [width, height] = typeof shape === 'string' ? SIZES[shape] : shape
  return tree(both(name, entry, [width, height]).light)
}

function uris(root: Node): (string | null)[] {
  return clicks(root)
    .filter((c) => c.action === 'OPEN_URI')
    .map((c) => c.uri)
}

function link(n: number, detail: string | null = null): WidgetLink {
  return { title: `Item ${n}`, detail, url: `ihsaanly://item/i${n}` }
}

const empty: Partial<WidgetModel> = {
  rightNow: null,
  alsoNow: [],
  next: null,
  prayers: [],
  allDay: [],
  comingUp: [],
  quickDuas: [],
  duaOfTheDay: null,
  makeUp: { prayers: 0, fasts: 0, summary: null, url: 'ihsaanly://qada' },
}

describe('Android widgets on the sample entry', () => {
  for (const name of WIDGET_NAMES) {
    for (const shape of SHAPES) {
      it(`${name} at ${shape} says the right things and links to the right items`, () => {
        const root = light(name, model(), shape)
        expect(texts(root)).toEqual(EXPECTED[name][shape].texts)
        expect(uris(root)).toEqual(EXPECTED[name][shape].uris)
      })
    }
  }

  it('draws both schemes, each in its own ink', () => {
    const entry = model()
    const drawn = both('MakeUpWidget', entry, [250, 150])
    const background = (root: Node): unknown => {
      const style = root.props.style
      return typeof style === 'object' && style !== null && 'backgroundGradient' in style
        ? style.backgroundGradient
        : null
    }
    expect(background(tree(drawn.light))).toMatchObject({ from: entry.ink.light.background })
    expect(background(tree(drawn.dark))).toMatchObject({
      from: entry.ink.dark.background,
      to: entry.ink.dark.backgroundEnd,
    })
  })
})

describe('Android widgets when the timeline has run out or the name is unknown', () => {
  for (const name of [...WIDGET_NAMES, 'SomethingElseWidget']) {
    it(`${name} only asks for the app`, () => {
      const root = light(name, model({ stale: true }), 'medium')
      expect(texts(root)).toEqual([model().labels.openApp])
      expect(clicks(root)).toEqual([{ action: 'OPEN_APP', uri: null }])
    })
  }

  it('an unknown widget name draws the stale view even for a live entry', () => {
    const root = light('SomethingElseWidget', model(), 'medium')
    expect(texts(root)).toEqual([model().labels.openApp])
  })
})

describe('Android widget registry', () => {
  it('fails loudly for a registered name that has no widget component', () => {
    Array.prototype.push.call(WIDGET_NAMES, 'ForgottenWidget')
    try {
      expect(() => representation(info('ForgottenWidget', 250, 150), model())).toThrow()
    } finally {
      Array.prototype.pop.call(WIDGET_NAMES)
    }
    expect(WIDGET_NAMES).toHaveLength(10)
  })
})

describe('Android widgets with nothing to show', () => {
  const none = model(empty)
  const nothing = none.labels.nothingNow

  it('RightNowWidget keeps the window caption and says nothing is asked', () => {
    const root = light('RightNowWidget', { ...none, window: null }, 'large')
    expect(texts(root)).toEqual([none.labels.rightNow, nothing])
    expect(clicks(root)).toEqual([{ action: 'OPEN_APP', uri: null }])
  })

  for (const name of [
    'NextPrayerWidget',
    'UpNextWidget',
    'AlsoTodayWidget',
    'QuickDuasWidget',
    'ComingUpWidget',
    'DuaOfTheDayWidget',
  ] as const) {
    for (const shape of SHAPES) {
      it(`${name} at ${shape} says nothing is asked and has no item links`, () => {
        const root = light(name, none, shape)
        expect(texts(root)).toContain(nothing)
        expect(uris(root)).toEqual([])
      })
    }
  }

  it('MakeUpWidget says nothing is owed at every size, still linking to the make-up screen', () => {
    for (const shape of SHAPES) {
      const root = light('MakeUpWidget', none, shape)
      expect(texts(root)).toContain(none.labels.nothingOwed)
      expect(uris(root)).toEqual(['ihsaanly://qada'])
    }
  })

  it('PrayersWidget with tracking paused shows the date instead of marks', () => {
    const root = light('PrayersWidget', none, 'medium')
    expect(texts(root)).toEqual([none.labels.prayers, none.date.gregorian])
  })

  it('PrayersWidget drops the caption on a short strip', () => {
    const root = light('PrayersWidget', none, [300, 80])
    expect(texts(root)).toEqual([none.date.gregorian])
  })

  it('HijriDateWidget leaves out a missing place', () => {
    const noPlace = model({ date: { ...model().date, place: null } })
    expect(texts(light('HijriDateWidget', noPlace, 'medium'))).toEqual([
      'Hijri date',
      '12 Rabi’ ath-Thani 1448',
      'Wed 23 Sep',
    ])
    expect(texts(light('HijriDateWidget', noPlace, 'large'))).toEqual([
      'Hijri date',
      '12 Rabi’ ath-Thani 1448',
      'Wed 23 Sep',
      'Morning',
    ])
  })

  it('HijriDateWidget on a large widget leaves out a missing window', () => {
    const root = light('HijriDateWidget', model({ window: null }), 'large')
    expect(texts(root)).toEqual(['Hijri date', '12 Rabi’ ath-Thani 1448', 'Wed 23 Sep', 'London'])
  })

  it('DuaOfTheDayWidget keeps its caption when there is no dua', () => {
    expect(texts(light('DuaOfTheDayWidget', none, 'medium'))).toEqual([
      none.labels.duaOfTheDay,
      nothing,
    ])
  })
})

describe('Android widgets with a full day', () => {
  const links = [link(1, 'In 2 days'), link(2, 'In 3 days'), link(3), link(4), link(5), link(6)]
  const busy = model({
    rightNow: { title: 'Dhuha', detail: 'Two rak’ah', url: 'ihsaanly://item/dhuha' },
    alsoNow: links.slice(0, 5),
    allDay: links,
    comingUp: links,
    quickDuas: links.slice(0, 5),
    next: { prayer: 'Jumu’ah', distance: 'Soon', before: links, after: links.slice(0, 2) },
    prayers: [
      { name: 'Fajr', short: 'F', done: true, passed: true },
      { name: 'Dhuhr', short: 'D', done: false, passed: true },
      { name: 'Asr', short: 'A', done: false, passed: false },
      { name: 'Maghrib', short: 'M', done: true, passed: false },
      { name: 'Isha', short: 'I', done: false, passed: false },
    ],
    makeUp: {
      prayers: 3,
      fasts: 2,
      summary: '3 prayers owed · 2 fasts owed',
      url: 'ihsaanly://qada',
    },
    duaOfTheDay: { title: 'T', arabic: 'ع', translation: null, url: 'ihsaanly://item/t' },
  })

  it('RightNowWidget shows the detail from medium up and lists what else is open when large', () => {
    expect(texts(light('RightNowWidget', busy, 'square'))).toEqual(['Morning', 'Dhuha'])
    expect(texts(light('RightNowWidget', busy, 'medium'))).toEqual([
      'Morning',
      'Dhuha',
      'Two rak’ah',
    ])
    const large = light('RightNowWidget', busy, 'large')
    expect(texts(large)).toEqual([
      'Morning',
      'Dhuha',
      'Two rak’ah',
      'Item 1',
      'Item 2',
      'Item 3',
      'Item 4',
      'Item 5',
    ])
    expect(uris(large)).toEqual([
      'ihsaanly://item/dhuha',
      'ihsaanly://item/i1',
      'ihsaanly://item/i2',
      'ihsaanly://item/i3',
      'ihsaanly://item/i4',
      'ihsaanly://item/i5',
    ])
  })

  it('RightNowWidget falls back to its own caption when no window is known', () => {
    const root = light('RightNowWidget', { ...busy, window: null }, 'medium')
    expect(texts(root)[0]).toBe(busy.labels.rightNow)
  })

  it('NextPrayerWidget splits the large widget between before and after', () => {
    const root = light('NextPrayerWidget', busy, 'large')
    expect(texts(root).slice(0, 3)).toEqual(['Up next', 'Jumu’ah', 'Soon'])
    // 8 rows fit: four of the six before-items, then both after-items.
    expect(uris(root)).toHaveLength(6)
    expect(texts(root).filter((t) => t.startsWith('Before'))).not.toHaveLength(0)
    expect(texts(root).filter((t) => t.startsWith('After'))).not.toHaveLength(0)
  })

  it('AlsoTodayWidget shows details and as many rows as fit when large', () => {
    const compact = light('AlsoTodayWidget', busy, 'square')
    expect(texts(compact)).toEqual(['Also today', 'Item 1'])
    const large = light('AlsoTodayWidget', busy, 'large')
    expect(texts(large)).toContain('In 2 days')
    expect(uris(large).length).toBeGreaterThan(1)
    const medium = light('AlsoTodayWidget', busy, 'medium')
    expect(texts(medium)).not.toContain('In 2 days')
  })

  it('UpNextWidget limits a compact widget to one row', () => {
    const root = light('UpNextWidget', busy, 'square')
    expect(uris(root)).toEqual(['ihsaanly://item/i1'])
  })

  it('UpNextWidget on a large widget shows the distance', () => {
    expect(texts(light('UpNextWidget', busy, 'large'))).toContain('Soon')
  })

  it('UpNextWidget with only after-items still lists them', () => {
    const afterOnly = model({
      next: { prayer: 'Asr', distance: 'Soon', before: [], after: links.slice(0, 2) },
    })
    const root = light('UpNextWidget', afterOnly, 'medium')
    expect(texts(root)).toEqual(['Up next · Asr', 'After · Item 1', 'After · Item 2'])
  })

  it('QuickDuasWidget lays duas out in two columns on a wide widget and pads an odd row', () => {
    const root = light('QuickDuasWidget', busy, [300, 200])
    expect(texts(root)).toEqual(['Quick duas', 'Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'])
    const rows = nodes(root).filter(
      (n) =>
        n.type === 'FlexWidget' &&
        (n.props.style as { flexDirection?: string }).flexDirection === 'row',
    )
    expect(rows.map((row) => row.children.length)).toEqual([2, 2, 2])
  })

  it('QuickDuasWidget is one column on a narrow widget', () => {
    const root = light('QuickDuasWidget', busy, [200, 300])
    expect(texts(root).length).toBeGreaterThan(1)
    expect(uris(root)[0]).toBe('ihsaanly://item/i1')
  })

  it('MakeUpWidget joins the summary on a compact widget and splits it otherwise', () => {
    expect(texts(light('MakeUpWidget', busy, 'square'))).toEqual([
      'To make up',
      '3 prayers owed · 2 fasts owed',
    ])
    expect(texts(light('MakeUpWidget', busy, 'medium'))).toEqual([
      'To make up',
      '3 prayers owed',
      '2 fasts owed',
    ])
    expect(texts(light('MakeUpWidget', busy, 'large'))).toEqual([
      'To make up',
      '3 prayers owed',
      '2 fasts owed',
      busy.date.hijri,
    ])
  })

  it('MakeUpWidget treats a count without a summary as nothing owed', () => {
    const odd = model({ makeUp: { prayers: 2, fasts: 0, summary: null, url: 'ihsaanly://qada' } })
    expect(texts(light('MakeUpWidget', odd, 'medium'))).toEqual([
      'To make up',
      odd.labels.nothingOwed,
    ])
  })

  it('ComingUpWidget lists every row with its detail, and the compact one links to the first item', () => {
    const root = light('ComingUpWidget', busy, 'large')
    expect(texts(root)).toContain('In 3 days')
    expect(uris(root)).toHaveLength(6)
    const compact = light('ComingUpWidget', busy, 'square')
    expect(texts(compact)).toEqual(['Later this week', 'Item 1', 'In 2 days'])
    expect(uris(compact)).toEqual(['ihsaanly://item/i1'])
    const noDetail = light('ComingUpWidget', model({ comingUp: [link(9)] }), 'square')
    expect(texts(noDetail)).toEqual(['Later this week', 'Item 9'])
  })

  it('DuaOfTheDayWidget sizes the Arabic by widget size and hides the title when compact', () => {
    const lines = (shape: Shape): number | undefined => {
      const arabic = nodes(light('DuaOfTheDayWidget', busy, shape)).find(
        (n) => n.props.text === 'ع',
      )
      return arabic?.props.maxLines as number | undefined
    }
    expect(lines('square')).toBe(2)
    expect(lines('medium')).toBe(3)
    expect(lines('large')).toBe(6)
    expect(texts(light('DuaOfTheDayWidget', busy, 'large'))).toEqual(['T', 'ع'])
  })
})

describe('Android widgets in a right-to-left language', () => {
  const rtl = model({ rtl: true })

  it('PrayersWidget reverses the marks', () => {
    const forward = texts(light('PrayersWidget', model(), 'square')).slice(1)
    expect(texts(light('PrayersWidget', rtl, 'square')).slice(1)).toEqual([...forward].reverse())
  })

  it('aligns text to the right and the frame to flex-end', () => {
    const root = light('HijriDateWidget', rtl, 'medium')
    expect((root.props.style as { alignItems?: string }).alignItems).toBe('flex-end')
    const aligns = nodes(root).map(
      (n) => (n.props.style as { textAlign?: string } | undefined)?.textAlign,
    )
    expect(aligns.filter((a) => a === 'right').length).toBeGreaterThan(0)
    expect(aligns).not.toContain('left')
  })

  it('puts the dot after the title in a row', () => {
    const root = light('NextPrayerWidget', rtl, 'medium')
    const row = nodes(root).find((n) => n.props.clickAction === 'OPEN_URI')
    expect(
      row?.children.map((c) =>
        typeof c === 'string'
          ? c
          : c.props.style && 'flex' in (c.props.style as object)
            ? 'title'
            : 'dot',
      ),
    ).toEqual(['title', 'dot'])
  })

  it('QuickDuasWidget reverses its columns', () => {
    const wide = [300, 200] as [number, number]
    const ltr = uris(light('QuickDuasWidget', model(), wide))
    expect(uris(light('QuickDuasWidget', rtl, wide))).toEqual([
      ...ltr.slice(0, 2).reverse(),
      ...ltr.slice(2, 4).reverse(),
      ...ltr.slice(4),
    ])
  })
})

describe('Android widget helpers', () => {
  it('layoutFor sorts launcher sizes by dp', () => {
    expect(parts.layoutFor(info('x', 179, 300)).size).toBe('compact')
    expect(parts.layoutFor(info('x', 300, 109)).size).toBe('compact')
    expect(parts.layoutFor(info('x', 180, 110)).size).toBe('medium')
    expect(parts.layoutFor(info('x', 300, 219)).size).toBe('medium')
    expect(parts.layoutFor(info('x', 300, 220)).size).toBe('large')
    expect(parts.layoutFor(info('x', 250, 300))).toEqual({ size: 'large', width: 250, height: 300 })
  })

  it('rowsFit counts rows under the padding and caption, and never drops below one', () => {
    const layout = { size: 'medium' as const, width: 250, height: 150 }
    expect(parts.rowsFit(layout, 24)).toBe(4)
    expect(parts.rowsFit(layout, 24, 40)).toBe(2)
    expect(parts.rowsFit(layout, 24, 500)).toBe(1)
  })

  it('ordered reverses a copy only for right-to-left', () => {
    const list = [1, 2, 3]
    expect(parts.ordered(false, list)).toBe(list)
    expect(parts.ordered(true, list)).toEqual([3, 2, 1])
    expect(list).toEqual([1, 2, 3])
  })

  it('paintFor keeps valid hex, falls back on invalid, and dims with alpha', () => {
    const ink = model().ink.light
    const paint = parts.paintFor(ink)
    expect(String(paint.accent)).toBe(ink.accent)
    expect(String(paint.dimmed)).toBe(`${ink.secondaryLabel}66`)
    const bad = parts.paintFor({
      background: 'red',
      backgroundEnd: 'blue',
      surface: '',
      accent: 'x',
      onAccent: '#fff',
      label: 'rgb(0,0,0)',
      secondaryLabel: 'grey',
    })
    expect(bad).toEqual({
      from: '#ffffff',
      to: '#ffffff',
      surface: '#ffffff',
      accent: '#a94a32',
      onAccent: '#ffffff',
      label: '#000000',
      secondary: '#777777',
      dimmed: '#77777766',
    })
    expect(String(parts.paintFor({ ...ink, backgroundEnd: 'nope' }).to)).toBe(ink.background)
  })

  it('LinkRow links to its own item, with a tag and a detail when asked', () => {
    const paint = parts.paintFor(model().ink.light)
    const plain = tree(parts.LinkRow({ link: link(1, 'In 2 days'), paint, rtl: false }))
    expect(clicks(plain)).toEqual([{ action: 'OPEN_URI', uri: 'ihsaanly://item/i1' }])
    expect(texts(plain)).toEqual(['Item 1'])
    expect((plain.props.style as { height: number }).height).toBe(parts.ROW_HEIGHT)
    const rich = tree(
      parts.LinkRow({
        link: link(1, 'In 2 days'),
        paint,
        rtl: false,
        showDetail: true,
        tag: 'Before',
      }),
    )
    expect(texts(rich)).toEqual(['Before · Item 1', 'In 2 days'])
    expect((rich.props.style as { height: number }).height).toBe(parts.DETAIL_ROW_HEIGHT)
    const noDetail = tree(parts.LinkRow({ link: link(2), paint, rtl: false, showDetail: true }))
    expect((noDetail.props.style as { height: number }).height).toBe(parts.ROW_HEIGHT)
  })

  it('LinkList shows at most `limit` rows and none for a negative limit', () => {
    const paint = parts.paintFor(model().ink.light)
    const links = [link(1), link(2), link(3)]
    expect(texts(tree(parts.LinkList({ links, paint, rtl: false, limit: 2 })))).toEqual([
      'Item 1',
      'Item 2',
    ])
    expect(texts(tree(parts.LinkList({ links, paint, rtl: false, limit: -1 })))).toEqual([])
  })

  it('Frame opens the app without a url and the url when given', () => {
    const paint = parts.paintFor(model().ink.light)
    const open = tree(parts.Frame({ model: model(), paint, url: null, label: 'x' }))
    expect(open.props.clickAction).toBe('OPEN_APP')
    expect(open.props.clickActionData).toBeUndefined()
    const url = tree(parts.Frame({ model: model(), paint, url: 'ihsaanly://x', label: 'x' }))
    expect(url.props.clickActionData).toEqual({ uri: 'ihsaanly://x' })
  })
})
