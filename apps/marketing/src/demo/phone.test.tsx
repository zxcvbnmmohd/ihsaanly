import { afterEach, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test'
import { loadLanguagePack } from '@ihsaanly/core/i18n/language-pack'
import { en } from '@ihsaanly/core/strings/en'
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderSite, type SiteRender } from '../../test/site'
import { applyDemoTranslation } from './demo-content'
import { demoCopyFor } from './demo-strings'

// The real Today screen, but watched: the demo has no location, suggestion,
// make-up or fasting controls to press, so its inert callbacks are called directly.
const { TodayScreen: RealTodayScreen, ...otherExports } = await import('@ihsaanly/ui/screens/today')
let todayProps: Parameters<typeof RealTodayScreen>[0] | null = null
mock.module('@ihsaanly/ui/screens/today', () => ({
  ...otherExports,
  TodayScreen: (props: Parameters<typeof RealTodayScreen>[0]) => {
    todayProps = props
    return RealTodayScreen(props)
  },
}))

const { Phone } = await import('./phone')

// Wednesday 30 September 2026, 13:00 in Makkah: Dhuhr's window.
const MIDDAY = new Date(Date.UTC(2026, 8, 30, 10, 0))
const zone = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'Asia/Riyadh'
  setSystemTime(MIDDAY)
})
afterEach(() => {
  setSystemTime()
  if (zone === undefined) delete process.env.TZ
  else process.env.TZ = zone
  applyDemoTranslation(null)
})

async function phone(lang: 'en' | 'ar' = 'en'): Promise<SiteRender> {
  const pack = await loadLanguagePack(lang)
  return renderSite(<Phone pack={pack} />, { lang })
}

const link = (name: string | RegExp): HTMLElement => screen.getByRole('link', { name })

describe('Phone: Today', () => {
  test("shows the plan for the visitor's city and clock", async () => {
    await phone()
    expect(document.querySelector('.demo-statusbar-time')).toHaveTextContent('1:00')
    expect(screen.getByRole('heading', { name: 'After Dhuhr' })).toBeInTheDocument()
    expect(screen.getByText(/Wed, Sep 30/)).toHaveTextContent('Makkah')
    expect(screen.getByRole('checkbox', { name: 'Dhuhr' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('tab', { name: 'Today' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'demo-tab-today')
  })

  test('is a left-to-right English phone, and right-to-left in Arabic', async () => {
    const view = await phone()
    expect(document.getElementById('demo-phone')).toHaveAttribute('dir', 'ltr')
    view.unmount()
    await phone('ar')
    expect(document.getElementById('demo-phone')).toHaveAttribute('dir', 'rtl')
    expect(document.getElementById('demo-phone')).toHaveAttribute('lang', 'ar')
  })

  test('the coach points at the current prayer first', async () => {
    await phone()
    expect(screen.getByRole('note')).toHaveTextContent('Tap to mark Dhuhr as prayed')
  })

  test('marking the coached prayer moves the coach on; marking again unmarks', async () => {
    const { user } = await phone()
    const dhuhr = screen.getByRole('checkbox', { name: 'Dhuhr' })
    await user.click(dhuhr)
    expect(dhuhr).toHaveAttribute('aria-checked', 'true')
    await waitFor(() =>
      expect(screen.getByRole('note')).toHaveTextContent(demoCopyFor('en').coachTapCircle),
    )
    await user.click(dhuhr)
    expect(dhuhr).toHaveAttribute('aria-checked', 'false')
  })

  test('marking some other prayer ends the coach', async () => {
    const { user } = await phone()
    await user.click(screen.getByRole('checkbox', { name: 'Fajr' }))
    await waitFor(() => expect(screen.queryByRole('note')).toBeNull())
  })

  test('the callbacks the demo cannot act on do nothing', async () => {
    await phone()
    const before = document.body.innerHTML
    act(() => {
      todayProps?.onUseMyLocation()
      todayProps?.onAddSuggestion('x')
      todayProps?.onDismissSuggestion('x')
      todayProps?.onMakeUp('fajr')
      todayProps?.onRecordFastOwed()
      todayProps?.onUndoFastOwed()
    })
    expect(todayProps).not.toBeNull()
    expect(document.body.innerHTML).toBe(before)
  })
})

describe('Phone: circles on Today', () => {
  const circle = (name: string | RegExp): HTMLElement => screen.getByRole('button', { name })

  test('ticking a circle moves the row to Done today and shows the undo bar', async () => {
    const { user } = await phone()
    const title = (todayProps?.now[0]?.title ?? '') as string
    await user.click(circle(new RegExp(`^${en.today.markDone(title)}$`)))
    expect(screen.queryByRole('link', { name: en.today.open(title) })).toBeNull()
    expect(screen.getByRole('button', { name: en.today.undoItem(title) })).toBeInTheDocument()
    expect(todayProps?.doneToday.map((entry) => entry.title)).toContain(title)
    // The coach has done its job once a circle is tapped.
    expect(screen.queryByRole('note')).toBeNull()
  })

  test('Undo puts the row back; the bar also times out', async () => {
    const { user } = await phone()
    const title = (todayProps?.now[0]?.title ?? '') as string
    await user.click(circle(new RegExp(`^${en.today.markDone(title)}$`)))
    await user.click(screen.getByRole('button', { name: en.today.undoItem(title) }))
    expect(screen.getByRole('link', { name: en.today.open(title) })).toBeInTheDocument()
    act(() => {
      todayProps?.onDismissUndo()
    })
    expect(todayProps?.undo).toBeNull()
  })

  test('a done row can be unmarked from Done today', async () => {
    const { user } = await phone()
    const id = todayProps?.now[0]?.id ?? ''
    await user.click(circle(new RegExp(`^${en.today.markDone(todayProps?.now[0]?.title ?? '')}$`)))
    act(() => {
      todayProps?.onCircle(id)
    })
    expect(todayProps?.doneToday.map((entry) => entry.id)).not.toContain(id)
  })

  test('a counted dhikr opens its counter, which counts to the end and closes', async () => {
    const { user } = await phone()
    await user.click(screen.getByRole('checkbox', { name: 'Dhuhr' }))
    act(() => {
      todayProps?.onCircle('tasbih-after-prayer')
    })
    expect(todayProps?.panel).toMatchObject({ kind: 'count', count: 0, target: 33 })
    act(() => {
      for (let tap = 0; tap < 33; tap++) todayProps?.onCount('tasbih-after-prayer')
    })
    expect(todayProps?.panel).toBeNull()
    expect(todayProps?.doneToday.map((entry) => entry.id)).toContain('tasbih-after-prayer')
  })

  test('the sheet can be closed, completed and marked all, and parts toggled', async () => {
    const { user } = await phone()
    await user.click(screen.getByRole('checkbox', { name: 'Dhuhr' }))
    act(() => {
      todayProps?.onCircle('tasbih-after-prayer')
    })
    act(() => {
      todayProps?.onClosePanel()
    })
    expect(todayProps?.panel).toBeNull()
    act(() => {
      todayProps?.onComplete('tasbih-after-prayer')
    })
    expect(todayProps?.doneToday.map((entry) => entry.id)).toContain('tasbih-after-prayer')
    act(() => {
      todayProps?.onMarkAll('istighfar')
    })
    expect(todayProps?.undo?.id).toStartWith('istighfar#')
    act(() => {
      todayProps?.onTogglePart('morning-adhkar', 'nope')
    })
    expect(todayProps?.panel).toBeNull()
  })
})

describe('Phone: tabs and Library', () => {
  test('the Library tab lists items under categories and ends the coach', async () => {
    const { user } = await phone()
    await user.click(screen.getByRole('tab', { name: 'Library' }))
    expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Adhkar' })).toBeInTheDocument()
    expect(screen.queryByRole('note')).toBeNull()
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', en.library.search)
  })

  test('searching narrows the list, and the filter chips switch the list', async () => {
    const { user } = await phone()
    await user.click(screen.getByRole('tab', { name: 'Library' }))
    await user.type(screen.getByRole('searchbox'), 'siwak')
    expect(screen.queryByRole('link', { name: /Morning adhkar/ })).toBeNull()
    expect(link(/Siwak before prayer/)).toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox'))
    await user.click(screen.getByRole('button', { name: /^On Today/ }))
    expect(screen.queryByRole('link', { name: /Siwak before prayer/ })).toBeNull()
    expect(link(/Morning adhkar/)).toBeInTheDocument()
  })

  test("the More tab shows the app's settings rows", async () => {
    const { user } = await phone()
    await user.click(screen.getByRole('tab', { name: 'More' }))
    expect(screen.getByRole('heading', { name: 'More' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'More' })).toHaveAttribute('aria-selected', 'true')
  })

  test('a link that leaves the demo does nothing', async () => {
    const { user } = await phone()
    await user.click(screen.getByRole('tab', { name: 'Library' }))
    await user.click(link(/^Glossary/))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })
})

describe('Phone: an item', () => {
  async function openTasbih(): Promise<SiteRender> {
    const view = await phone()
    await view.user.click(screen.getByRole('tab', { name: 'Library' }))
    await view.user.click(link(/Tasbih after prayer/))
    return view
  }

  test('opens from the Library with a back button that returns to it', async () => {
    const { user } = await openTasbih()
    expect(screen.getByRole('heading', { name: 'Tasbih after prayer' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: en.onboarding.back }))
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  test("opens from Today's own cards", async () => {
    const { user } = await phone()
    await user.click(link(/Two or four rak/))
    expect(screen.getByRole('button', { name: en.onboarding.back })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: en.onboarding.back }))
    expect(screen.getByRole('checkbox', { name: 'Dhuhr' })).toBeInTheDocument()
  })

  test('the counter counts, starts again, and completes the item at its target', async () => {
    const { user } = await openTasbih()
    const counter = screen.getByRole('button', { name: 'Tasbih after prayer' })
    expect(counter).toHaveTextContent('0/ 33')
    await user.click(counter)
    await user.click(counter)
    expect(counter).toHaveTextContent('2/ 33')
    await user.click(screen.getByRole('button', { name: en.item.counterReset }))
    expect(counter).toHaveTextContent('0/ 33')
    for (let tap = 0; tap < 33; tap++) await user.click(counter)
    expect(screen.queryByRole('button', { name: 'Tasbih after prayer' })).toBeNull()
    expect(screen.getByRole('button', { name: en.item.undo })).toBeInTheDocument()
  })

  test('Done and Undo toggle the item', async () => {
    const { user } = await openTasbih()
    await user.click(screen.getByRole('button', { name: en.item.done }))
    expect(screen.getByRole('button', { name: en.item.undo })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: en.item.undo }))
    expect(screen.getByRole('button', { name: en.item.done })).toBeInTheDocument()
  })

  test('"on Today" and the reminder switches toggle', async () => {
    const { user } = await openTasbih()
    const onToday = screen.getByRole('switch', { name: new RegExp(en.item.onToday) })
    expect(onToday).toHaveAttribute('aria-checked', 'true')
    await user.click(onToday)
    expect(screen.getByRole('switch', { name: new RegExp(en.item.onToday) })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    await user.click(screen.getByRole('switch', { name: new RegExp(en.item.onToday) }))
    expect(screen.getByRole('switch', { name: new RegExp(en.item.onToday) })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('the reminder switch toggles on its own, for items with a window', async () => {
    const { user } = await phone()
    await user.click(screen.getByRole('tab', { name: 'Library' }))
    await user.click(link(/Morning adhkar/))
    const remind = (): HTMLElement =>
      screen.getByRole('switch', { name: new RegExp(en.item.remind) })
    const onToday = (): HTMLElement =>
      screen.getByRole('switch', { name: new RegExp(en.item.onToday) })
    const before = remind().getAttribute('aria-checked')
    await user.click(remind())
    expect(remind().getAttribute('aria-checked')).not.toBe(before)
    expect(onToday()).toHaveAttribute('aria-checked', 'true')
  })

  test('"Share as text" and "Share as image" use the browser share sheet where there is one', async () => {
    const share = mock(async (_data: ShareData) => {})
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    try {
      const { user } = await openTasbih()
      await user.click(screen.getByText(en.item.shareText))
      await user.click(screen.getByText(en.item.shareImage))
      expect(share).toHaveBeenCalledTimes(2)
      expect(share.mock.calls[0]?.[0].text).toContain('Tasbih')
    } finally {
      Reflect.deleteProperty(navigator, 'share')
    }
  })

  test('sharing is quiet without a share sheet, and when it is dismissed', async () => {
    const { user } = await openTasbih()
    await user.click(screen.getByText(en.item.shareText))
    const share = mock(() => Promise.reject(new Error('AbortError')))
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    try {
      await user.click(screen.getByText(en.item.shareText))
      expect(share).toHaveBeenCalledTimes(1)
    } finally {
      Reflect.deleteProperty(navigator, 'share')
    }
    expect(screen.getByRole('heading', { name: 'Tasbih after prayer' })).toBeInTheDocument()
  })
})

describe('Phone: tabs from the keyboard', () => {
  test('arrow keys move between tabs', async () => {
    await phone()
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('Phone: the clock', () => {
  test('re-plans every minute and when the tab becomes visible again', async () => {
    const intervals: (() => void)[] = []
    const real = window.setInterval
    window.setInterval = ((callback: () => void) => {
      intervals.push(callback)
      return 1
    }) as unknown as typeof window.setInterval
    try {
      await phone()
    } finally {
      window.setInterval = real
    }
    expect(document.querySelector('.demo-statusbar-time')).toHaveTextContent('1:00')
    setSystemTime(new Date(MIDDAY.getTime() + 5 * 60_000))
    act(() => intervals.at(-1)?.())
    expect(document.querySelector('.demo-statusbar-time')).toHaveTextContent('1:05')

    setSystemTime(new Date(MIDDAY.getTime() + 9 * 60_000))
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(document.querySelector('.demo-statusbar-time')).toHaveTextContent('1:05')
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(document.querySelector('.demo-statusbar-time')).toHaveTextContent('1:09')
  })

  test('stops its timers and listeners when it goes away', async () => {
    const view = await phone()
    const clear = mock(window.clearInterval.bind(window))
    const real = window.clearInterval
    window.clearInterval = clear as typeof window.clearInterval
    try {
      view.unmount()
    } finally {
      window.clearInterval = real
    }
    expect(clear).toHaveBeenCalled()
    expect(within(document.body).queryByRole('tablist')).toBeNull()
  })
})
