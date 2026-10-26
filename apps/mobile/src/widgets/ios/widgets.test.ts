import { describe, expect, it } from 'bun:test'

import {
  type Env,
  iosWidget,
  model,
  modifiers,
  type Node,
  nodes,
  texts,
  tree,
  widgetUrls,
} from '../../../test/widgets'
import type { WidgetItem, WidgetLink, WidgetModel, WidgetTap } from '../model'

const FILES = {
  RightNowWidget: 'right-now',
  NextPrayerWidget: 'next-prayer',
  PrayersWidget: 'prayers',
  HijriDateWidget: 'hijri-date',
  UpNextWidget: 'up-next',
  AlsoTodayWidget: 'also-today',
  QuickDuasWidget: 'quick-duas',
  DuaOfTheDayWidget: 'dua-of-the-day',
  MakeUpWidget: 'make-up',
  ComingUpWidget: 'coming-up',
} as const
const ARABIC = model().duaOfTheDay?.arabic ?? ''
type Name = keyof typeof FILES

const NAMES = Object.keys(FILES) as Name[]
for (const file of Object.values(FILES)) await import(`./${file}-widget.tsx?actual`)

const FAMILIES = [
  'accessoryInline',
  'accessoryCircular',
  'accessoryRectangular',
  'systemSmall',
  'systemMedium',
  'systemLarge',
  'systemExtraLarge',
] as const

function draw(name: Name, entry: WidgetModel, env: Env = {}): Node {
  return tree(iosWidget(name)(entry, env))
}

function link(n: number, detail: string | null = null): WidgetLink {
  return { title: `Item ${n}`, detail, url: `ihsaanly://item/i${n}` }
}

/** A row the widget cannot mark: an id, and no `since`. */
function asItem(entry: WidgetLink): WidgetItem {
  return { ...entry, id: entry.url.replace('ihsaanly://item/', '') }
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

describe('iOS widgets on the sample entry', () => {
  const expected: Record<Name, Record<(typeof FAMILIES)[number], [string[], string]>> = {
    RightNowWidget: {
      accessoryInline: [['Morning adhkar'], 'ihsaanly://item/read/morning-adhkar'],
      accessoryCircular: [['1'], 'ihsaanly://item/read/morning-adhkar'],
      accessoryRectangular: [['Morning', 'Morning adhkar'], 'ihsaanly://item/read/morning-adhkar'],
      systemSmall: [
        ['Morning', 'Morning adhkar', 'Open for about 3 more hours', '12 Rabi’ ath-Thani 1448'],
        'ihsaanly://item/read/morning-adhkar',
      ],
      systemMedium: [
        ['Morning · Open for about 3 more hours', 'Morning adhkar', '12 Rabi’ ath-Thani 1448'],
        'ihsaanly://item/read/morning-adhkar',
      ],
      systemLarge: [
        [
          'Right now',
          'Morning',
          'Morning adhkar',
          'Open for about 3 more hours',
          'Up next',
          'Dhuhr · In about 3 hours',
          '12 Rabi’ ath-Thani 1448',
        ],
        'ihsaanly://item/read/morning-adhkar',
      ],
      systemExtraLarge: [
        [
          'Right now',
          'Morning',
          'Morning adhkar',
          'Open for about 3 more hours',
          'Up next',
          'Dhuhr · In about 3 hours',
          '12 Rabi’ ath-Thani 1448',
        ],
        'ihsaanly://item/read/morning-adhkar',
      ],
    },
    NextPrayerWidget: {
      accessoryInline: [['Dhuhr · In about 3 hours'], 'ihsaanly://'],
      accessoryCircular: [['Dhuhr'], 'ihsaanly://'],
      accessoryRectangular: [
        ['Dhuhr', 'In about 3 hours', 'Two or four rak’ah before Dhuhr'],
        'ihsaanly://',
      ],
      systemSmall: [['Up next', 'Dhuhr', 'In about 3 hours'], 'ihsaanly://'],
      systemMedium: [
        [
          'Up next',
          'Dhuhr · In about 3 hours',
          'Before: Two or four rak’ah before Dhuhr',
          'After: Tasbih after prayer',
        ],
        'ihsaanly://',
      ],
      systemLarge: [
        [
          'Up next',
          'Dhuhr',
          'In about 3 hours',
          'Before',
          'Two or four rak’ah before Dhuhr',
          'After',
          'Tasbih after prayer',
          'Two rak’ah after Dhuhr',
        ],
        'ihsaanly://',
      ],
      systemExtraLarge: [
        [
          'Up next',
          'Dhuhr',
          'In about 3 hours',
          'Before',
          'Two or four rak’ah before Dhuhr',
          'After',
          'Tasbih after prayer',
          'Two rak’ah after Dhuhr',
        ],
        'ihsaanly://',
      ],
    },
    PrayersWidget: {
      accessoryInline: [['Prayers 1/5'], 'ihsaanly://'],
      accessoryCircular: [['Prayers'], 'ihsaanly://'],
      accessoryRectangular: [['Prayers 1/5'], 'ihsaanly://'],
      systemSmall: [['Prayers', '1/5'], 'ihsaanly://'],
      systemMedium: [['Prayers · 1/5', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], 'ihsaanly://'],
      systemLarge: [['Prayers', '1/5', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], 'ihsaanly://'],
      systemExtraLarge: [
        ['Prayers', '1/5', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
        'ihsaanly://',
      ],
    },
    HijriDateWidget: {
      accessoryInline: [['12 Rabi’ ath-Thani 1448'], 'ihsaanly://hijri'],
      accessoryCircular: [['12'], 'ihsaanly://hijri'],
      accessoryRectangular: [
        ['12 Rabi’ ath-Thani 1448', 'Wed 23 Sep · London'],
        'ihsaanly://hijri',
      ],
      systemSmall: [['Hijri date', '12 Rabi’ ath-Thani 1448', 'Wed 23 Sep'], 'ihsaanly://hijri'],
      systemMedium: [
        ['Hijri date', '12 Rabi’ ath-Thani 1448', 'Wed 23 Sep · London'],
        'ihsaanly://hijri',
      ],
      systemLarge: [
        ['Hijri date', '12 Rabi’ ath-Thani 1448', 'Wed 23 Sep', 'London'],
        'ihsaanly://hijri',
      ],
      systemExtraLarge: [
        ['Hijri date', '12 Rabi’ ath-Thani 1448', 'Wed 23 Sep', 'London'],
        'ihsaanly://hijri',
      ],
    },
    UpNextWidget: {
      accessoryInline: [
        ['Dhuhr: Two or four rak’ah before Dhuhr'],
        'ihsaanly://item/sunnah-before-dhuhr',
      ],
      accessoryCircular: [['3', 'Dhuhr'], 'ihsaanly://item/sunnah-before-dhuhr'],
      accessoryRectangular: [
        ['Dhuhr', 'Before: Two or four rak’ah before Dhuhr', 'After: Tasbih after prayer'],
        'ihsaanly://item/sunnah-before-dhuhr',
      ],
      systemSmall: [
        ['Up next · Dhuhr', 'Two or four rak’ah before Dhuhr', '+2'],
        'ihsaanly://item/sunnah-before-dhuhr',
      ],
      systemMedium: [
        [
          'Up next · Dhuhr',
          'Before',
          'Two or four rak’ah before Dhuhr',
          'After',
          'Tasbih after prayer',
          'Two rak’ah after Dhuhr',
        ],
        'ihsaanly://item/sunnah-before-dhuhr',
      ],
      systemLarge: [
        [
          'Up next · Dhuhr',
          'In about 3 hours',
          'Before',
          'Two or four rak’ah before Dhuhr',
          'After',
          'Tasbih after prayer',
          'Two rak’ah after Dhuhr',
        ],
        'ihsaanly://item/sunnah-before-dhuhr',
      ],
      systemExtraLarge: [
        [
          'Up next · Dhuhr',
          'In about 3 hours',
          'Before',
          'Two or four rak’ah before Dhuhr',
          'After',
          'Tasbih after prayer',
          'Two rak’ah after Dhuhr',
        ],
        'ihsaanly://item/sunnah-before-dhuhr',
      ],
    },
    AlsoTodayWidget: {
      accessoryInline: [['Nothing asked of you right now'], 'ihsaanly://'],
      accessoryCircular: [[], 'ihsaanly://'],
      accessoryRectangular: [['Nothing asked of you right now'], 'ihsaanly://'],
      systemSmall: [['Also today', 'Nothing asked of you right now'], 'ihsaanly://'],
      systemMedium: [['Also today', 'Nothing asked of you right now'], 'ihsaanly://'],
      systemLarge: [['Also today', 'Nothing asked of you right now'], 'ihsaanly://'],
      systemExtraLarge: [['Also today', 'Nothing asked of you right now'], 'ihsaanly://'],
    },
    QuickDuasWidget: {
      accessoryInline: [['Quick duas'], 'ihsaanly://item/read/dua-leaving-home'],
      accessoryCircular: [[], 'ihsaanly://item/read/dua-leaving-home'],
      accessoryRectangular: [
        ['Quick duas', 'Leaving home', 'Setting out on a journey'],
        'ihsaanly://item/read/dua-leaving-home',
      ],
      systemSmall: [
        ['Quick duas', 'Leaving home', 'Setting out on a journey', 'Shortening the prayer'],
        'ihsaanly://item/read/dua-leaving-home',
      ],
      systemMedium: [
        [
          'Quick duas',
          'Leaving home',
          'Setting out on a journey',
          'Shortening the prayer',
          'Going up',
        ],
        'ihsaanly://item/read/dua-leaving-home',
      ],
      systemLarge: [
        [
          'Quick duas',
          'Leaving home',
          'Setting out on a journey',
          'Shortening the prayer',
          'Going up',
          'Going down',
        ],
        'ihsaanly://item/read/dua-leaving-home',
      ],
      systemExtraLarge: [
        [
          'Quick duas',
          'Leaving home',
          'Setting out on a journey',
          'Shortening the prayer',
          'Going up',
          'Going down',
        ],
        'ihsaanly://item/read/dua-leaving-home',
      ],
    },
    DuaOfTheDayWidget: {
      accessoryInline: [['Coming home'], 'ihsaanly://item/read/dua-entering-home'],
      accessoryCircular: [['Coming home'], 'ihsaanly://item/read/dua-entering-home'],
      accessoryRectangular: [[ARABIC, 'Coming home'], 'ihsaanly://item/read/dua-entering-home'],
      systemSmall: [
        ['Dua of the day', ARABIC, 'Coming home'],
        'ihsaanly://item/read/dua-entering-home',
      ],
      systemMedium: [
        ['Dua of the day', ARABIC, 'Coming home'],
        'ihsaanly://item/read/dua-entering-home',
      ],
      systemLarge: [
        ['Dua of the day', ARABIC, 'Coming home', 'In the name of Allah.'],
        'ihsaanly://item/read/dua-entering-home',
      ],
      systemExtraLarge: [
        ['Dua of the day', ARABIC, 'Coming home', 'In the name of Allah.'],
        'ihsaanly://item/read/dua-entering-home',
      ],
    },
    MakeUpWidget: {
      accessoryInline: [['1 prayer owed'], 'ihsaanly://qada'],
      accessoryCircular: [['1'], 'ihsaanly://qada'],
      accessoryRectangular: [['To make up', '1 prayer owed'], 'ihsaanly://qada'],
      systemSmall: [['To make up', '1', '1 prayer owed'], 'ihsaanly://qada'],
      systemMedium: [['To make up', '1 prayer owed'], 'ihsaanly://qada'],
      systemLarge: [['To make up', '1 prayer owed'], 'ihsaanly://qada'],
      systemExtraLarge: [['To make up', '1 prayer owed'], 'ihsaanly://qada'],
    },
    ComingUpWidget: {
      accessoryInline: [['Surah al-Kahf on Friday · In 2 days'], 'ihsaanly://item/kahf-friday'],
      accessoryCircular: [['2'], 'ihsaanly://item/kahf-friday'],
      accessoryRectangular: [
        [
          'Later this week',
          'Surah al-Kahf on Friday · In 2 days',
          'Abundant salawat on the Prophet ﷺ · In 2 days',
        ],
        'ihsaanly://item/kahf-friday',
      ],
      systemSmall: [
        ['Later this week', 'Surah al-Kahf on Friday', 'In 2 days'],
        'ihsaanly://item/kahf-friday',
      ],
      systemMedium: [
        [
          'Later this week',
          'Surah al-Kahf on Friday',
          'In 2 days',
          'Abundant salawat on the Prophet ﷺ',
          'In 2 days',
        ],
        'ihsaanly://item/kahf-friday',
      ],
      systemLarge: [
        [
          'Later this week',
          'Surah al-Kahf on Friday',
          'In 2 days',
          'Abundant salawat on the Prophet ﷺ',
          'In 2 days',
        ],
        'ihsaanly://item/kahf-friday',
      ],
      systemExtraLarge: [
        [
          'Later this week',
          'Surah al-Kahf on Friday',
          'In 2 days',
          'Abundant salawat on the Prophet ﷺ',
          'In 2 days',
        ],
        'ihsaanly://item/kahf-friday',
      ],
    },
  }

  for (const name of NAMES) {
    for (const family of FAMILIES) {
      it(`${name} ${family} says the right things and opens the right place`, () => {
        const root = draw(name, model(), { widgetFamily: family })
        const [wanted, url] = expected[name][family]
        expect(texts(root)).toEqual(wanted)
        expect(widgetUrls(root)).toEqual([url])
      })
    }
  }

  it('falls back to the small family when none is given', () => {
    expect(texts(draw('NextPrayerWidget', model()))).toEqual(
      texts(draw('NextPrayerWidget', model(), { widgetFamily: 'systemSmall' })),
    )
  })
})

describe('iOS widgets when the timeline has run out', () => {
  for (const name of NAMES) {
    for (const family of FAMILIES) {
      it(`${name} ${family} only asks for the app`, () => {
        const root = draw(name, model({ stale: true }), { widgetFamily: family })
        const text = texts(root)
        if (family === 'accessoryCircular') {
          expect(text).toEqual([])
          expect(nodes(root).some((n) => n.props.systemName === 'arrow.clockwise')).toBe(true)
        } else {
          expect(text).toEqual([model().labels.openApp])
        }
        expect(widgetUrls(root)).toEqual(['ihsaanly://'])
      })
    }
  }
})

describe('iOS widgets with nothing to show', () => {
  const none = model(empty)
  const nothing = none.labels.nothingNow

  it('RightNowWidget shows the window and the nothing-asked line', () => {
    const root = draw('RightNowWidget', none, { widgetFamily: 'systemMedium' })
    expect(texts(root)).toContain(nothing)
    expect(widgetUrls(root)[0]).toStartWith('ihsaanly://')
  })

  for (const name of [
    'RightNowWidget',
    'NextPrayerWidget',
    'PrayersWidget',
    'UpNextWidget',
  ] as const) {
    for (const family of FAMILIES) {
      it(`${name} ${family} says nothing is asked`, () => {
        const root = draw(name, none, { widgetFamily: family })
        const circular = family === 'accessoryCircular'
        if (!circular) expect(texts(root).join(' ')).toContain(nothing)
        expect(widgetUrls(root)).toHaveLength(1)
      })
    }
  }

  it('MakeUpWidget says nothing is owed', () => {
    for (const family of FAMILIES) {
      const root = draw('MakeUpWidget', none, { widgetFamily: family })
      expect(texts(root).join(' ')).toMatch(
        family === 'accessoryCircular' ? /0|✓|^$/ : /Nothing owed/,
      )
      expect(widgetUrls(root)).toEqual(['ihsaanly://qada'])
    }
  })

  it('ComingUpWidget and AlsoTodayWidget say nothing is asked', () => {
    for (const name of ['ComingUpWidget', 'AlsoTodayWidget'] as const) {
      for (const family of FAMILIES) {
        const root = draw(name, none, { widgetFamily: family })
        expect(widgetUrls(root)).toHaveLength(1)
        if (family !== 'accessoryCircular') expect(texts(root).join(' ')).toContain(nothing)
      }
    }
  })

  it('QuickDuasWidget and DuaOfTheDayWidget keep their title and open the app', () => {
    for (const [name, title] of [
      ['QuickDuasWidget', none.labels.quickDuas],
      ['DuaOfTheDayWidget', none.labels.duaOfTheDay],
    ] as const) {
      for (const family of FAMILIES) {
        const root = draw(name, none, { widgetFamily: family })
        expect(widgetUrls(root)).toEqual(['ihsaanly://'])
        if (family !== 'accessoryCircular') expect(texts(root)).toContain(title)
      }
    }
  })

  it('PrayersWidget with tracking paused draws no marks', () => {
    const root = draw('PrayersWidget', none, { widgetFamily: 'systemSmall' })
    expect(nodes(root).filter((n) => n.type === 'Circle')).toHaveLength(0)
  })

  it('HijriDateWidget leaves out a missing place', () => {
    const noPlace = model({ date: { ...model().date, place: null } })
    expect(
      texts(draw('HijriDateWidget', noPlace, { widgetFamily: 'accessoryRectangular' })),
    ).toEqual(['12 Rabi’ ath-Thani 1448', 'Wed 23 Sep'])
    expect(texts(draw('HijriDateWidget', noPlace, { widgetFamily: 'systemLarge' }))).toEqual([
      'Hijri date',
      '12 Rabi’ ath-Thani 1448',
      'Wed 23 Sep',
    ])
  })
})

describe('iOS widgets with a full day', () => {
  const links = [
    link(1, 'In 2 days'),
    link(2, 'In 3 days'),
    link(3),
    link(4),
    link(5),
    link(6),
    link(7),
  ]
  const busy = model({
    rightNow: { id: 'dhuha', title: 'Dhuha', detail: 'Two rak’ah', url: 'ihsaanly://item/dhuha' },
    alsoNow: links.slice(0, 3),
    allDay: links,
    comingUp: links,
    quickDuas: links.map(asItem),
    next: {
      prayer: 'Jumu’ah',
      distance: 'Soon',
      before: links.map(asItem),
      after: links.slice(0, 2),
    },
    prayers: [
      { id: 'fajr', name: 'Fajr', short: 'F', done: true, passed: true },
      { id: 'dhuhr', name: 'Dhuhr', short: 'D', done: false, passed: true },
      { id: 'asr', name: 'Asr', short: 'A', done: false, passed: false },
      { id: 'maghrib', name: 'Maghrib', short: 'M', done: true, passed: false },
      { id: 'isha', name: 'Isha', short: 'I', done: false, passed: false },
    ],
    makeUp: {
      prayers: 3,
      fasts: 2,
      summary: '3 prayers owed · 2 fasts owed',
      url: 'ihsaanly://qada',
    },
    duaOfTheDay: {
      id: 't',
      title: 'T',
      arabic: 'ع',
      translation: null,
      url: 'ihsaanly://item/t',
      since: 0,
      done: false,
    },
  })

  for (const name of NAMES) {
    for (const family of FAMILIES) {
      it(`${name} ${family} renders`, () => {
        const root = draw(name, busy, { widgetFamily: family })
        expect(widgetUrls(root).length).toBeGreaterThan(0)
        expect(texts(root).length + nodes(root).length).toBeGreaterThan(0)
      })
    }
  }

  it('RightNowWidget large lists what else is open, with the detail', () => {
    const root = draw('RightNowWidget', busy, { widgetFamily: 'systemLarge' })
    const text = texts(root)
    expect(text).toContain('Dhuha')
    expect(text).toContain('Item 1')
  })

  it('NextPrayerWidget extra large shows more rows than large, each its own link', () => {
    const large = draw('NextPrayerWidget', busy, { widgetFamily: 'systemLarge' })
    const wide = draw('NextPrayerWidget', busy, { widgetFamily: 'systemExtraLarge' })
    const destinations = (root: Node): unknown[] =>
      nodes(root)
        .filter((n) => n.type === 'Link')
        .map((n) => n.props.destination)
    expect(destinations(large)).toHaveLength(6)
    expect(destinations(wide)).toHaveLength(8)
    expect(destinations(wide)[0]).toBe('ihsaanly://item/i1')
  })

  it('PrayersWidget counts what is done and fills those circles', () => {
    const root = draw('PrayersWidget', busy, { widgetFamily: 'systemMedium' })
    expect(texts(root)[0]).toBe('Prayers · 2/5')
    expect(nodes(root).filter((n) => n.type === 'Circle')).toHaveLength(5)
  })

  it('MakeUpWidget gives each owed kind its own line on a large widget', () => {
    const text = texts(draw('MakeUpWidget', busy, { widgetFamily: 'systemLarge' }))
    expect(text.join(' ')).toContain('3 prayers owed')
    expect(text.join(' ')).toContain('2 fasts owed')
  })
})

describe('iOS widgets by layout direction and rendering mode', () => {
  const rtl = model({ rtl: true })

  for (const name of NAMES) {
    it(`${name} aligns to the trailing edge in right-to-left languages`, () => {
      const root = draw(name, rtl, { widgetFamily: 'systemMedium' })
      expect(nodes(root).some((n) => n.props.alignment === 'trailing')).toBe(true)
      expect(nodes(root).some((n) => n.props.alignment === 'leading')).toBe(false)
    })

    it(`${name} aligns to the leading edge otherwise`, () => {
      const root = draw(name, model(), { widgetFamily: 'systemMedium' })
      expect(nodes(root).some((n) => n.props.alignment === 'leading')).toBe(true)
    })
  }

  it('PrayersWidget reverses its marks in right-to-left languages', () => {
    const marks = (entry: WidgetModel): string[] =>
      texts(draw('PrayersWidget', entry, { widgetFamily: 'systemMedium' })).slice(1)
    expect(marks(rtl)).toEqual([...marks(model())].reverse())
    const rows = texts(draw('PrayersWidget', rtl, { widgetFamily: 'systemLarge' }))
    expect(rows).toEqual(['Prayers', '1/5', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'])
  })

  const styles = (root: Node): unknown[] =>
    nodes(root).flatMap((n) =>
      modifiers(n)
        .filter((m) => m.modifier === 'foregroundStyle')
        .map((m) => m.args[0]),
    )

  it('uses the entry ink in full colour, light and dark', () => {
    const entry = model()
    const light = styles(draw('HijriDateWidget', entry, { widgetFamily: 'systemSmall' }))
    const dark = styles(
      draw('HijriDateWidget', entry, { widgetFamily: 'systemSmall', colorScheme: 'dark' }),
    )
    expect(light).toContain(entry.ink.light.label)
    expect(light).toContain(entry.ink.light.accent)
    expect(dark).toContain(entry.ink.dark.label)
    expect(dark).not.toContain(entry.ink.light.label)
  })

  it('relies on hierarchy, not hex, in tinted mode and on the Lock Screen', () => {
    for (const env of [
      { widgetFamily: 'systemSmall', widgetRenderingMode: 'accented' },
      { widgetFamily: 'accessoryRectangular' },
    ]) {
      for (const name of NAMES) {
        const used = styles(draw(name, model(), env))
        expect(used.every((s) => typeof s === 'object' || s === 'clear')).toBe(true)
      }
    }
  })

  it('paints the Home Screen background as a gradient and the tinted one flat', () => {
    const background = (root: Node): unknown =>
      nodes(root)
        .flatMap(modifiers)
        .find((m) => m.modifier === 'containerBackground')?.args[0]
    const entry = model()
    expect(background(draw('MakeUpWidget', entry, { widgetFamily: 'systemSmall' }))).toMatchObject({
      type: 'linearGradient',
      colors: [entry.ink.light.background, entry.ink.light.backgroundEnd],
    })
    expect(
      background(
        draw('MakeUpWidget', entry, {
          widgetFamily: 'systemSmall',
          widgetRenderingMode: 'accented',
        }),
      ),
    ).toBe(entry.ink.light.background)
  })
})

describe('RightNowWidget, marking done from the widget', () => {
  const button = (root: Node): Node | undefined => nodes(root).find((n) => n.type === 'Button')
  const press = (root: Node): Partial<WidgetModel> => {
    const onPress = button(root)?.props.onPress
    if (typeof onPress !== 'function') throw new Error('no button')
    return onPress() as Partial<WidgetModel>
  }

  for (const family of ['systemSmall', 'systemMedium', 'systemLarge'] as const) {
    it(`${family} offers the button, and a press appends a tap for the headline item`, () => {
      const root = draw('RightNowWidget', model(), { widgetFamily: family })
      expect(button(root)?.props.label).toBe('Mark done')
      expect(button(root)?.props.target).toBe('mark-done')
      const before = Date.now()
      const { taps } = press(root)
      expect(taps).toHaveLength(1)
      expect(taps?.[0]?.id).toBe('morning-adhkar')
      expect(taps?.[0]?.at).toBeGreaterThanOrEqual(before)
    })
  }

  it('keeps earlier taps when another is made', () => {
    const earlier = { id: 'other', at: 5 }
    const { taps } = press(
      draw('RightNowWidget', model({ taps: [earlier] }), { widgetFamily: 'systemSmall' }),
    )
    expect(taps?.[0]).toEqual(earlier)
    expect(taps).toHaveLength(2)
  })

  it('shows the icon alone on a small widget and the words on larger ones', () => {
    const small = button(draw('RightNowWidget', model(), { widgetFamily: 'systemSmall' }))
    const medium = button(draw('RightNowWidget', model(), { widgetFamily: 'systemMedium' }))
    const styles = (node: Node | undefined): unknown[] =>
      node
        ? modifiers(node)
            .filter((m) => m.modifier === 'labelStyle')
            .map((m) => m.args[0])
        : []
    expect(styles(small)).toEqual(['iconOnly'])
    expect(styles(medium)).toEqual([])
  })

  it('shows the item done, without a button, once tapped in this occasion', () => {
    const tapped = model({ taps: [{ id: 'morning-adhkar', at: (model().openedAt ?? 0) + 60_000 }] })
    const medium = draw('RightNowWidget', tapped, { widgetFamily: 'systemMedium' })
    expect(button(medium)).toBeUndefined()
    expect(texts(medium)).toContain('Marked done')
    const small = draw('RightNowWidget', tapped, { widgetFamily: 'systemSmall' })
    expect(button(small)).toBeUndefined()
    expect(nodes(small).some((n) => n.props.systemName === 'checkmark.circle.fill')).toBe(true)
  })

  it('does not count a tap from an earlier occasion of the same item, or another item', () => {
    const opened = model().openedAt ?? 0
    const earlier = model({
      taps: [
        { id: 'morning-adhkar', at: opened - 1 },
        { id: 'evening-adhkar', at: opened + 1 },
      ],
    })
    expect(button(draw('RightNowWidget', earlier, { widgetFamily: 'systemSmall' }))).toBeDefined()
  })

  it('offers no button when nothing is asked, nor on the Lock Screen', () => {
    for (const family of FAMILIES) {
      expect(button(draw('RightNowWidget', model(empty), { widgetFamily: family }))).toBeUndefined()
    }
    for (const family of ['accessoryInline', 'accessoryCircular', 'accessoryRectangular']) {
      expect(button(draw('RightNowWidget', model(), { widgetFamily: family }))).toBeUndefined()
    }
  })

  it('leaves out how long the moment stays open when it asks nothing', () => {
    const root = draw('RightNowWidget', model(empty), { widgetFamily: 'systemSmall' })
    expect(texts(root)).not.toContain('Open for about 3 more hours')
  })
})

describe('RightNowWidget, what else is open and the date', () => {
  const others = [link(1), link(2)]

  it('small says how many more are open', () => {
    const root = draw('RightNowWidget', model({ alsoNow: others, moreNow: '+2 more now' }), {
      widgetFamily: 'systemSmall',
    })
    expect(texts(root)).toContain('+2 more now')
    expect(texts(root)).not.toContain('Item 1')
  })

  it('medium lists a single other as a row, and several as a count that opens Today', () => {
    const one = draw(
      'RightNowWidget',
      model({ alsoNow: others.slice(0, 1), moreNow: '+1 more now' }),
      { widgetFamily: 'systemMedium' },
    )
    expect(texts(one)).toContain('Item 1')
    expect(texts(one)).not.toContain('+1 more now')
    const two = draw('RightNowWidget', model({ alsoNow: others, moreNow: '+2 more now' }), {
      widgetFamily: 'systemMedium',
    })
    expect(texts(two)).toContain('+2 more now')
    const more = nodes(two).find((n) => n.type === 'Link' && texts(n).includes('+2 more now'))
    expect(more?.props.destination).toBe('ihsaanly://')
  })

  it('puts the Hijri date on the reading side and the button on the far side', () => {
    const footer = (rtl: boolean): string[] => {
      const root = draw('RightNowWidget', model({ rtl }), { widgetFamily: 'systemSmall' })
      const row = nodes(root).find(
        (n) =>
          n.type === 'HStack' &&
          n.children.some((child) => typeof child !== 'string' && child.type === 'Button'),
      )
      return (row?.children ?? []).map((child) => (typeof child === 'string' ? child : child.type))
    }
    expect(footer(false)).toEqual(['Text', 'Spacer', 'Button'])
    expect(footer(true)).toEqual(['Button', 'Spacer', 'Text'])
  })
})

describe('iOS widgets, marking from the widget', () => {
  const buttons = (root: Node): Node[] => nodes(root).filter((n) => n.type === 'Button')
  const pressed = (button: Node | undefined): WidgetTap[] => {
    const onPress = button?.props.onPress
    if (typeof onPress !== 'function') throw new Error('no button')
    return (onPress() as Partial<WidgetModel>).taps ?? []
  }
  const target = (root: Node, name: string): Node | undefined =>
    buttons(root).find((n) => n.props.target === name)
  const opened = model().openedAt ?? 0
  const tasbih = (count: number): WidgetItem => ({
    id: 'tasbih-after-prayer',
    title: 'Tasbih after prayer',
    detail: null,
    url: 'ihsaanly://item/tasbih-after-prayer',
    since: opened,
    done: false,
    repeat: 33,
    count,
  })
  const tap = (kind: WidgetTap['kind'], id: string, at = opened + 1): WidgetTap => ({
    kind,
    id,
    at,
  })

  it('gives every button in a widget a target of its own', () => {
    for (const name of NAMES) {
      for (const family of FAMILIES) {
        const all = buttons(draw(name, model(), { widgetFamily: family })).map(
          (n) => n.props.target,
        )
        expect(new Set(all).size).toBe(all.length)
      }
    }
  })

  it('RightNowWidget files a done press with its kind', () => {
    const [first] = pressed(target(draw('RightNowWidget', model()), 'mark-done'))
    expect(first?.kind).toBe('done')
  })

  it('RightNowWidget counts a counted item with +1 from medium up, and how far it has got', () => {
    const entry = model({ rightNow: tasbih(10), taps: [tap('count', 'tasbih-after-prayer')] })
    for (const family of ['systemMedium', 'systemLarge'] as const) {
      const root = draw('RightNowWidget', entry, { widgetFamily: family })
      expect(texts(root)).toContain('11 of 33')
      const add = target(root, 'count-one')
      expect(add?.props.label).toBe('+1')
      const taps = pressed(add)
      expect(taps).toHaveLength(2)
      expect(taps[1]).toMatchObject({ kind: 'count', id: 'tasbih-after-prayer' })
      expect(target(root, 'mark-done')).toBeUndefined()
    }
    // A small widget has room for the check alone, which marks the whole item.
    const small = draw('RightNowWidget', entry, { widgetFamily: 'systemSmall' })
    expect(target(small, 'mark-done')).toBeDefined()
    expect(target(small, 'count-one')).toBeUndefined()
  })

  it('RightNowWidget shows a count done once its taps reach the repeat', () => {
    const entry = model({
      rightNow: tasbih(32),
      taps: [tap('count', 'tasbih-after-prayer'), tap('count', 'tasbih-after-prayer', opened - 1)],
      rtl: true,
    })
    const root = draw('RightNowWidget', entry, { widgetFamily: 'systemMedium' })
    expect(buttons(root)).toEqual([])
    expect(texts(root)).toContain('Marked done')
    const rtl = draw('RightNowWidget', model({ rightNow: tasbih(3), rtl: true }), {
      widgetFamily: 'systemMedium',
    })
    const row = nodes(rtl).find(
      (n) =>
        n.type === 'HStack' &&
        n.children.some((child) => typeof child !== 'string' && child.props.target === 'count-one'),
    )
    expect(row?.children.map((child) => (typeof child === 'string' ? child : child.type))).toEqual([
      'Button',
      'Text',
    ])
  })

  it('PrayersWidget makes an opened, unmarked prayer a button that marks it', () => {
    const prayers = model().prayers.map((prayer) =>
      prayer.id === 'dhuhr' ? { ...prayer, since: opened } : prayer,
    )
    for (const family of ['systemMedium', 'systemLarge'] as const) {
      const root = draw('PrayersWidget', model({ prayers }), { widgetFamily: family })
      expect(buttons(root).map((n) => n.props.target)).toEqual(['prayer-dhuhr'])
      const [made] = pressed(target(root, 'prayer-dhuhr'))
      expect(made).toMatchObject({ kind: 'prayer', id: 'dhuhr' })
    }
    // Small circles are too small to aim at; the Lock Screen has no buttons.
    for (const family of ['systemSmall', 'accessoryRectangular'] as const) {
      expect(buttons(draw('PrayersWidget', model({ prayers }), { widgetFamily: family }))).toEqual(
        [],
      )
    }
  })

  it('PrayersWidget shows a prayer marked on the widget as done', () => {
    const prayers = model().prayers.map((prayer) =>
      prayer.id === 'dhuhr' ? { ...prayer, since: opened } : prayer,
    )
    const marked = model({ prayers, taps: [tap('prayer', 'dhuhr')] })
    const root = draw('PrayersWidget', marked, { widgetFamily: 'systemMedium' })
    expect(buttons(root)).toEqual([])
    expect(texts(root)).toContain('Prayers · 2/5')
    // A tap before this prayer's window, or for another, does not count.
    const early = model({
      prayers,
      taps: [tap('prayer', 'dhuhr', opened - 1), tap('done', 'dhuhr')],
    })
    expect(buttons(draw('PrayersWidget', early, { widgetFamily: 'systemMedium' }))).toHaveLength(1)
  })

  it('UpNextWidget marks a named prayer’s “before” from its row, and leaves “after” a link', () => {
    for (const family of ['systemMedium', 'systemLarge'] as const) {
      const root = draw('UpNextWidget', model(), { widgetFamily: family })
      expect(buttons(root).map((n) => n.props.target)).toEqual(['done-sunnah-before-dhuhr'])
      const [made] = pressed(buttons(root)[0])
      expect(made).toMatchObject({ kind: 'done', id: 'sunnah-before-dhuhr' })
    }
    expect(buttons(draw('UpNextWidget', model(), { widgetFamily: 'systemSmall' }))).toEqual([])
  })

  it('UpNextWidget shows a row marked, from the widget or the app, with a check', () => {
    const since = model().next?.before[0]?.since ?? 0
    const tapped = model({ taps: [tap('done', 'sunnah-before-dhuhr', since + 1)] })
    const next = model().next
    const done = next
      ? model({ next: { ...next, before: next.before.map((b) => ({ ...b, done: true })) } })
      : model()
    for (const entry of [tapped, done]) {
      const root = draw('UpNextWidget', { ...entry, rtl: true }, { widgetFamily: 'systemLarge' })
      expect(buttons(root)).toEqual([])
      expect(nodes(root).some((n) => n.props.systemName === 'checkmark.circle.fill')).toBe(true)
    }
  })

  it('QuickDuasWidget gives each dua a mark of its own from medium up', () => {
    const duas = model().quickDuas
    for (const family of ['systemMedium', 'systemLarge'] as const) {
      const root = draw('QuickDuasWidget', model(), { widgetFamily: family })
      const shown = family === 'systemMedium' ? duas.slice(0, 4) : duas
      expect(buttons(root).map((n) => n.props.target)).toEqual(shown.map((dua) => `done-${dua.id}`))
    }
    const first = duas[0]
    const large = draw('QuickDuasWidget', model(), { widgetFamily: 'systemLarge' })
    expect(pressed(target(large, `done-${first?.id}`))[0]).toMatchObject({
      kind: 'done',
      id: first?.id,
    })
    const tapped = model({ taps: [tap('done', first?.id ?? '')] })
    const root = draw('QuickDuasWidget', tapped, { widgetFamily: 'systemLarge' })
    expect(target(root, `done-${first?.id}`)).toBeUndefined()
    expect(buttons(root)).toHaveLength(duas.length - 1)
  })

  it('DuaOfTheDayWidget says it from medium up, then shows it marked', () => {
    const dua = model().duaOfTheDay
    for (const family of ['systemMedium', 'systemLarge'] as const) {
      const root = draw('DuaOfTheDayWidget', model(), { widgetFamily: family })
      const said = target(root, 'said-it')
      expect(said?.props.label).toBe('Said it')
      expect(pressed(said)[0]).toMatchObject({ kind: 'done', id: dua?.id })
    }
    expect(buttons(draw('DuaOfTheDayWidget', model(), { widgetFamily: 'systemSmall' }))).toEqual([])
    const marked = model({ taps: [tap('done', dua?.id ?? '', (dua?.since ?? 0) + 1)] })
    const root = draw('DuaOfTheDayWidget', marked, { widgetFamily: 'systemLarge' })
    expect(buttons(root)).toEqual([])
    expect(texts(root)).toContain('Marked')
    // Yesterday's tap for the same dua is not today's.
    const yesterday = model({ taps: [tap('done', dua?.id ?? '', (dua?.since ?? 0) - 1)] })
    expect(
      target(draw('DuaOfTheDayWidget', yesterday, { widgetFamily: 'systemLarge' }), 'said-it'),
    ).toBeDefined()
  })
})
