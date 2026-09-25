// Entry point, bundled to site/assets/demo.js. Runs the phone's screens
// (Today, Library, item detail, More) on the app's real `plan()` through
// engine.ts, at the visitor's own time, in a Pixel-style Android frame, for a
// city in their own time zone. No framework: state lives in state.ts, and
// every change re-renders the phone from scratch.

import './zod-jitless'
import { itemById } from '@/content'
import type { Place } from '@/location/place'
import type { Prayer } from '@/prayer/qada'
import { defaultCityFor } from './cities'
import { demoCopyFor } from './demo-strings'
import { buildSignals, buildToday, toggleMark } from './engine'
import { buildItemDetail } from './item-detail'
import { readDemoLocale } from './locale'
import { buildLibrarySections } from './library'
import { renderNav, renderStatusBar, renderTabBar, type ChromeHandlers } from './render-chrome'
import { renderItem } from './render-item'
import { renderLibrary } from './render-library'
import { renderMore } from './render-more'
import { renderToday } from './render-today'
import { getState, initState, setState, subscribe, type DemoTab } from './state'

/**
 * The status bar clock is OS chrome, not app UI: Android formats it from the
 * device's own 12/24-hour setting, never from the app's display language, so
 * it stays fixed regardless of the page's `data-locale`.
 */
const STATUSBAR_LOCALE = 'en-US'

function placeLabelOf(place: Place): string {
  return place.label.split(',')[0]?.trim() ?? place.label
}

/** Android's compact status-bar clock: hour and minute, no seconds, no AM/PM. */
function statusBarTime(at: Date): string {
  return new Intl.DateTimeFormat(STATUSBAR_LOCALE, { hour: 'numeric', minute: '2-digit' })
    .format(at)
    .replace(/\s?[AP]M$/i, '')
}

function boot(): void {
  const phoneRef = document.getElementById('demo-phone')
  const statusbarRef = document.getElementById('demo-statusbar')
  const navRef = document.getElementById('demo-nav')
  const contentRef = document.getElementById('demo-content')
  const tabbarRef = document.getElementById('demo-tabbar')

  if (!phoneRef || !statusbarRef || !navRef || !contentRef || !tabbarRef) return

  // Rebound so TypeScript's non-null narrowing above survives into the
  // closures below — control-flow narrowing does not cross function
  // boundaries, but a fresh `const` keeps the narrowed type permanently.
  const statusbarEl = statusbarRef
  const navEl = navRef
  const contentEl = contentRef
  const tabbarEl = tabbarRef

  // The page sets `data-locale` and `dir` on <html>; read them once (the
  // demo has no in-page language switcher) and carry them onto the phone
  // screen itself so :lang()/[dir='rtl'] in demo.css can key off it, exactly
  // as the contract with the templates agent asks.
  const demoLocale = readDemoLocale(document.documentElement)
  phoneRef.lang = document.documentElement.lang
  phoneRef.dir = demoLocale.dir
  const demoCopy = demoCopyFor(demoLocale.language)

  initState({
    place: defaultCityFor(Intl.DateTimeFormat().resolvedOptions().timeZone),
    marks: {},
    view: 'today',
    previousTab: 'today',
    selectedItemId: null,
    libraryQuery: '',
  })

  const handlers: ChromeHandlers = {
    onSelectTab: (tab: DemoTab) => {
      setState({ view: tab, previousTab: tab === 'more' ? getState().previousTab : tab })
    },
    onBack: () => {
      setState({ view: getState().previousTab, selectedItemId: null })
    },
  }

  const onOpenItem = (id: string): void => {
    const state = getState()
    const previousTab =
      state.view === 'today' || state.view === 'library' ? state.view : state.previousTab
    setState({ view: 'item', selectedItemId: id, previousTab })
  }

  const onMarkPrayer = (prayer: Prayer): void => {
    const state = getState()
    setState({ marks: toggleMark(state.marks, prayer, new Date()) })
  }

  function render(): void {
    const state = getState()
    const at = new Date()
    const strings = demoLocale.strings
    const signals = buildSignals(state.place, at, state.marks)
    const placeLabel = placeLabelOf(state.place)
    const today = buildToday(signals, strings, demoLocale.intlLocale, placeLabel)

    renderStatusBar(statusbarEl, statusBarTime(at))

    // Each minute's re-render rebuilds the screen; keep the reader's place.
    const scrollTop = contentEl.scrollTop
    const activeTab: DemoTab = state.view === 'item' ? state.previousTab : state.view

    const focusedId =
      document.activeElement instanceof HTMLElement ? document.activeElement.id : null
    const selection =
      document.activeElement instanceof HTMLInputElement
        ? document.activeElement.selectionStart
        : null

    if (state.view === 'today') {
      renderNav(navEl, today.windowTitle, false, strings, handlers)
      renderToday(contentEl, today, strings, { onMarkPrayer, onOpenItem })
    } else if (state.view === 'library') {
      const sections = buildLibrarySections(state.libraryQuery, strings)
      renderNav(navEl, strings.library.title, false, strings, handlers)
      renderLibrary(contentEl, sections, state.libraryQuery, strings, {
        onOpenItem,
        onQueryChange: (query: string) => setState({ libraryQuery: query }),
      })
    } else if (state.view === 'item') {
      const item = state.selectedItemId ? itemById(state.selectedItemId) : undefined
      const detail = item ? buildItemDetail(item, strings) : null
      renderNav(navEl, detail?.title ?? strings.notFound.title, true, strings, handlers)
      renderItem(contentEl, detail, strings)
    } else {
      renderNav(navEl, strings.more.title, false, strings, handlers)
      renderMore(contentEl, demoCopy.moreBody)
    }

    renderTabBar(tabbarEl, activeTab, strings, demoCopy.tabsLabel, handlers)
    contentEl.scrollTop = scrollTop

    if (focusedId) {
      const again = document.getElementById(focusedId)
      if (again instanceof HTMLInputElement) {
        again.focus()
        if (selection !== null) again.setSelectionRange(selection, selection)
      } else if (again) {
        again.focus()
      }
    }
  }

  subscribe(render)
  render()
  // The day moves on by itself: re-plan every minute, and straight away when
  // the tab comes back after being hidden.
  window.setInterval(render, 60_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') render()
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
