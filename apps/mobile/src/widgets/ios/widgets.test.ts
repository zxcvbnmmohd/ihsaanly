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
import type { WidgetLink, WidgetModel } from '../model'

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
      accessoryInline: [['Morning adhkar'], 'ihsaanly://item/morning-adhkar'],
      accessoryCircular: [['1'], 'ihsaanly://item/morning-adhkar'],
      accessoryRectangular: [['Morning', 'Morning adhkar'], 'ihsaanly://item/morning-adhkar'],
      systemSmall: [['Morning', 'Morning adhkar'], 'ihsaanly://item/morning-adhkar'],
      systemMedium: [['Morning', 'Morning adhkar'], 'ihsaanly://item/morning-adhkar'],
      systemLarge: [
        ['Right now', 'Morning', 'Morning adhkar', 'Up next', 'Dhuhr · In about 3 hours'],
        'ihsaanly://item/morning-adhkar',
      ],
      systemExtraLarge: [
        ['Right now', 'Morning', 'Morning adhkar', 'Up next', 'Dhuhr · In about 3 hours'],
        'ihsaanly://item/morning-adhkar',
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
      accessoryInline: [['Quick duas'], 'ihsaanly://item/dua-leaving-home'],
      accessoryCircular: [[], 'ihsaanly://item/dua-leaving-home'],
      accessoryRectangular: [
        ['Quick duas', 'Leaving home', 'Setting out on a journey'],
        'ihsaanly://item/dua-leaving-home',
      ],
      systemSmall: [
        ['Quick duas', 'Leaving home', 'Setting out on a journey', 'Shortening the prayer'],
        'ihsaanly://item/dua-leaving-home',
      ],
      systemMedium: [
        [
          'Quick duas',
          'Leaving home',
          'Setting out on a journey',
          'Shortening the prayer',
          'Going up',
        ],
        'ihsaanly://item/dua-leaving-home',
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
        'ihsaanly://item/dua-leaving-home',
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
        'ihsaanly://item/dua-leaving-home',
      ],
    },
    DuaOfTheDayWidget: {
      accessoryInline: [['Coming home'], 'ihsaanly://item/dua-entering-home'],
      accessoryCircular: [['Coming home'], 'ihsaanly://item/dua-entering-home'],
      accessoryRectangular: [[ARABIC, 'Coming home'], 'ihsaanly://item/dua-entering-home'],
      systemSmall: [['Dua of the day', ARABIC, 'Coming home'], 'ihsaanly://item/dua-entering-home'],
      systemMedium: [
        ['Dua of the day', ARABIC, 'Coming home'],
        'ihsaanly://item/dua-entering-home',
      ],
      systemLarge: [
        ['Dua of the day', ARABIC, 'Coming home', 'In the name of Allah.'],
        'ihsaanly://item/dua-entering-home',
      ],
      systemExtraLarge: [
        ['Dua of the day', ARABIC, 'Coming home', 'In the name of Allah.'],
        'ihsaanly://item/dua-entering-home',
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
    rightNow: { title: 'Dhuha', detail: 'Two rak’ah', url: 'ihsaanly://item/dhuha' },
    alsoNow: links.slice(0, 3),
    allDay: links,
    comingUp: links,
    quickDuas: links,
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
