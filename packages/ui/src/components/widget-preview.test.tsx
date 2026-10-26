import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { widgetPreviewFixture as full } from '../screens/fixtures'
import {
  GALLERY_WIDGETS,
  type GalleryWidget,
  HOME_FAMILIES,
  LOCK_FAMILIES,
  type PreviewFamily,
  type PreviewPlatform,
  WidgetPreview,
  type WidgetPreviewModel,
} from './widget-preview'

/** Nothing planned, nothing owed, tracking paused: every widget's empty state. */
const empty: WidgetPreviewModel = {
  ...full,
  window: null,
  remaining: null,
  date: { ...full.date, place: null },
  rightNow: null,
  alsoNow: [],
  moreNow: null,
  next: null,
  prayers: [],
  allDay: [],
  comingUp: [],
  quickDuas: [],
  duaOfTheDay: null,
  makeUp: { prayers: 0, fasts: 0, summary: null },
}

/** Everything already marked, one other item open, and a next prayer that asks only after it. */
const done: WidgetPreviewModel = {
  ...full,
  rightNow: { title: 'Morning adhkar', detail: null, url: 'u', since: 1, done: true },
  alsoNow: [{ title: 'Duha prayer', detail: 'Until noon', url: 'ihsaanly://item/duha' }],
  moreNow: '+1 more now',
  next: {
    ...full.next,
    prayer: 'Asr',
    distance: 'Soon',
    before: [],
    after: full.next?.after ?? [],
  },
  duaOfTheDay: {
    ...(full.duaOfTheDay ?? { title: '', arabic: '' }),
    done: true,
    translation: null,
  },
  makeUp: { prayers: 2, fasts: 0, summary: null },
}

/** A plain item to mark, a count counted out, and a next prayer that asks nothing. */
const plain: WidgetPreviewModel = {
  ...full,
  rightNow: { title: 'Duha prayer', detail: null, url: 'u', since: 1 },
  next: { prayer: 'Maghrib', distance: 'Soon', before: [], after: [] },
}
const counted: WidgetPreviewModel = {
  ...full,
  rightNow: {
    ...(full.rightNow ?? plain.rightNow ?? { title: '', detail: null, url: '' }),
    count: 33,
  },
}

const FAMILIES: PreviewFamily[] = [...HOME_FAMILIES, ...LOCK_FAMILIES]

function show(
  widget: GalleryWidget,
  family: PreviewFamily,
  model = full,
  scheme?: 'dark',
  platform?: PreviewPlatform,
): void {
  renderScreen(
    <WidgetPreview
      widget={widget}
      family={family}
      model={model}
      label="Preview"
      platform={platform}
    />,
    { scheme },
  )
}

describe('every widget in every family', () => {
  for (const model of [full, empty, done, plain, counted]) {
    for (const widget of GALLERY_WIDGETS) {
      for (const family of FAMILIES) {
        it(`draws ${widget} ${family}`, () => {
          show(widget, family, model)
          expect(screen.getByRole('img', { name: 'Preview' })).toBeInTheDocument()
        })
      }
    }
  }
})

describe('on Android', () => {
  for (const model of [full, done]) {
    for (const widget of GALLERY_WIDGETS) {
      for (const family of HOME_FAMILIES) {
        it(`draws ${widget} ${family}`, () => {
          show(widget, family, model, undefined, 'android')
          expect(screen.getByRole('img', { name: 'Preview' })).toBeInTheDocument()
        })
      }
    }
  }

  it("marks with the app's own text button and prints no name under the widget", () => {
    show('rightNow', 'medium', plain, undefined, 'android')
    expect(screen.getByLabelText('Mark done')).toBeInTheDocument()
    expect(screen.queryByText('Ihsaanly')).not.toBeInTheDocument()
  })
})

describe('the scene', () => {
  it("puts the app's name under a Home Screen widget on iOS, as the system does", () => {
    show('prayers', 'small')
    expect(screen.getByText('Ihsaanly')).toBeInTheDocument()
    expect(screen.getByTestId('widget-frame')).toBeInTheDocument()
  })

  it('draws a Lock Screen widget under the date and the clock', () => {
    show('prayers', 'rectangular')
    expect(screen.getByText('Wed 23 Sep')).toBeInTheDocument()
    expect(screen.getByText('9:41')).toBeInTheDocument()
    expect(screen.getByTestId('lock-widget')).toBeInTheDocument()
  })

  it('sets an inline widget on the date line beside the date', () => {
    show('nextPrayer', 'inline')
    const line = screen.getByText('Wed 23 Sep').parentElement
    expect(line?.textContent).toBe('Wed 23 SepDhuhr · In about 3 hours')
    expect(screen.queryByTestId('lock-widget')).not.toBeInTheDocument()
  })
})

describe('right now', () => {
  it('counts a dhikr from medium up and keeps the round check on small', () => {
    show('rightNow', 'medium')
    expect(screen.getByText('12 of 33')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.getByText('Morning · Open for about 3 more hours')).toBeInTheDocument()
  })

  it('carries one round button on small', () => {
    show('rightNow', 'small')
    expect(screen.getByText('Tasbih')).toBeInTheDocument()
    expect(screen.getByText('+2 more now')).toBeInTheDocument()
    expect(screen.queryByText('+1')).not.toBeInTheDocument()
  })

  it('says it is marked once done', () => {
    show('rightNow', 'large', done)
    expect(screen.getByText('Marked done')).toBeInTheDocument()
    expect(screen.getByText('Until noon')).toBeInTheDocument()
  })

  it('offers Mark done for an item without a count', () => {
    show('rightNow', 'medium', plain)
    expect(screen.getByText('Mark done')).toBeInTheDocument()
  })

  it('counts what is open on the round Lock Screen widget', () => {
    show('rightNow', 'circular')
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('says nothing is asked when nothing is', () => {
    show('rightNow', 'small', empty)
    expect(screen.getByText(full.labels.nothingNow)).toBeInTheDocument()
  })
})

describe('the rest', () => {
  it('counts the prayers marked', () => {
    show('prayers', 'large')
    expect(screen.getByText('1/5')).toBeInTheDocument()
    expect(screen.getByText('Maghrib')).toBeInTheDocument()
  })

  it('puts the place beside the date', () => {
    show('hijriDate', 'medium')
    expect(screen.getByText('Wed 23 Sep · London')).toBeInTheDocument()
  })

  it('names what comes before and after the next prayer', () => {
    show('nextPrayer', 'medium')
    expect(screen.getByText('Dhuhr · In about 3 hours')).toBeInTheDocument()
    expect(screen.getByText('Before: Ghusl')).toBeInTheDocument()
    expect(screen.getByText('After: Sunnah after Dhuhr')).toBeInTheDocument()
  })

  it('marks a before only where it can be marked', () => {
    show('upNext', 'large')
    expect(screen.getAllByLabelText('Mark done')).toHaveLength(1)
    expect(screen.getByText('Wudu')).toBeInTheDocument()
  })

  it('draws the Arabic of the dua of the day with its Said it button', () => {
    show('duaOfTheDay', 'large', full, 'dark')
    expect(screen.getByText(full.duaOfTheDay?.arabic ?? '')).toBeInTheDocument()
    expect(screen.getByText('Said it')).toBeInTheDocument()
  })

  it('splits what is owed into its parts', () => {
    show('makeUp', 'medium')
    expect(screen.getByText('3 prayers owed')).toBeInTheDocument()
    expect(screen.getByText('2 fasts to make up')).toBeInTheDocument()
  })

  it('says nothing is owed', () => {
    show('makeUp', 'inline', empty)
    expect(screen.getByText(full.labels.nothingOwed)).toBeInTheDocument()
  })

  it('says when each coming item falls on one line', () => {
    show('comingUp', 'inline')
    expect(screen.getByText('Surah al-Kahf · Tomorrow')).toBeInTheDocument()
  })

  it('lays quick duas in two columns with their marks', () => {
    show('quickDuas', 'medium')
    expect(screen.getByText('Coming down')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Mark done')).toHaveLength(2)
  })
})
