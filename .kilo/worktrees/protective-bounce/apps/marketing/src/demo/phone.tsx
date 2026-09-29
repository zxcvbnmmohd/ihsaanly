// The live, interactive phone: the app's own Today, Library, item and More
// screens from @ihsaanly/ui, rendered through react-native-web, fed by the
// app's real `plan()` through engine.ts at the visitor's own time, in a
// Pixel-style Android frame, for a city guessed from their time zone. The
// status bar, app bar and tab bar are native chrome in the app, so the demo
// draws its own (render-chrome.tsx). Only ever loaded client-side (index.tsx
// loads it inside `<ClientOnly>` once the demo nears the viewport), so it may
// read the clock, the time zone and the DOM freely.

import type { Place } from '@ihsaanly/core/location/place'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import type { Strings } from '@ihsaanly/core/strings/en'
import { system } from '@ihsaanly/tailwind/tokens'
import { type UiContextValue, type UiLinkProps, UiProvider } from '@ihsaanly/ui/provider'
import { ItemScreen } from '@ihsaanly/ui/screens/item'
import { LibraryScreen } from '@ihsaanly/ui/screens/library'
import { MoreScreen } from '@ihsaanly/ui/screens/more'
import { TodayScreen } from '@ihsaanly/ui/screens/today'
import type { ReactElement, ReactNode } from 'react'
import { cloneElement, isValidElement, useEffect, useReducer, useRef, useState } from 'react'
import { useSite } from '~/i18n/use-site'
import { CoachOverlay, coachMarkIsTarget } from './coach'
import {
  buildItem,
  buildLibrary,
  buildMore,
  buildSignals,
  buildToday,
  shareTextFor,
} from './engine'
import type { LanguagePack } from './language-pack'
import { demoLocaleFor } from './locale'
import { type ChromeHandlers, Nav, StatusBar, TabBar } from './render-chrome'
import type { DemoAction, DemoTab } from './state'
import { demoReducer, initialDemoState } from './state'

type Scheme = 'light' | 'dark'

/**
 * The status bar clock is OS chrome, not app UI: Android formats it from the
 * device's own 12/24-hour setting, never from the app's display language, so
 * it stays fixed regardless of the page's locale.
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

function initState(): ReturnType<typeof initialDemoState> {
  return initialDemoState(Intl.DateTimeFormat().resolvedOptions().timeZone)
}

/** The page's theme: its own switch (`data-theme`) first, else the system's — as web.css decides. */
function pageScheme(): Scheme {
  const forced = document.documentElement.dataset.theme
  if (forced === 'light' || forced === 'dark') return forced
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const ITEM_HREF = /^\/item\/([^/?#]+)$/

/**
 * The screens only ever wrap a Pressable in a link (`asChild`), so a link to
 * an item becomes that Pressable with an open-item press; anywhere else the
 * app would go is outside the demo, and the child renders inert.
 */
function linkFor(dispatch: (action: DemoAction) => void): UiContextValue['Link'] {
  return function DemoLink({ href, children }: UiLinkProps): ReactNode {
    const id = ITEM_HREF.exec(href)?.[1]
    if (!id || !isValidElement<{ onPress?: () => void }>(children)) return children
    return cloneElement(children, { onPress: () => dispatch({ type: 'open-item', id }) })
  }
}

function uiFor(strings: Strings, scheme: Scheme, Link: UiContextValue['Link']): UiContextValue {
  return {
    strings,
    scheme,
    Link,
    systemColors: {
      label: system['system-label'].web[scheme],
      secondaryLabel: system['system-secondary-label'].web[scheme],
      separator: system['system-separator'].web[scheme],
      systemBackground: system['system-background'].web[scheme],
      secondarySystemBackground: system['system-secondary-background'].web[scheme],
      tint: system['system-tint'].web[scheme],
      onTint: system['system-on-tint'].web[scheme],
    },
  }
}

/** The browser's own share sheet where there is one; elsewhere sharing is the app's to do. */
function share(text: string): void {
  if (typeof navigator.share !== 'function') return
  navigator.share({ text }).catch(() => undefined)
}

interface Thing {
  now: Date
  scheme: Scheme
}

/** `pack` is the page language's strings and content, fetched alongside this chunk (index.tsx). */
export function Phone({ pack }: { pack: LanguagePack }): ReactElement {
  const { locale } = useSite()
  // Idempotent module-level write (see locale.ts); safe every render because
  // this component only ever renders in the browser, for one locale.
  const demoLocale = demoLocaleFor(pack)
  const [state, dispatch] = useReducer(demoReducer, undefined, initState)
  const [thing, setThing] = useState<Thing>(() => ({ now: new Date(), scheme: pageScheme() }))
  const { now, scheme } = thing
  const contentRef = useRef<HTMLDivElement | null>(null)
  const tabbarRef = useRef<HTMLDivElement | null>(null)
  const linkRef = useRef<UiContextValue['Link'] | null>(null)
  linkRef.current ??= linkFor(dispatch)

  // The day moves on by itself: re-plan every minute, and straight away when
  // the tab comes back after being hidden. The theme follows the page's
  // switch and the system's setting as they change.
  useEffect(() => {
    const tick = (): void => setThing((current) => ({ ...current, now: new Date() }))
    const rescheme = (): void => setThing((current) => ({ ...current, scheme: pageScheme() }))
    const interval = window.setInterval(tick, 60_000)
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') tick()
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const observer = new MutationObserver(rescheme)
    document.addEventListener('visibilitychange', onVisibility)
    media.addEventListener('change', rescheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      media.removeEventListener('change', rescheme)
      observer.disconnect()
    }
  }, [])

  const { strings, intlLocale, copy, language } = demoLocale
  const signals = buildSignals(state.place, now, state)
  const placeLabel = placeLabelOf(state.place)
  const today = buildToday(signals, strings, intlLocale, placeLabel)
  const activeTab: DemoTab = state.view === 'item' ? state.previousTab : state.view

  const handlers: ChromeHandlers = {
    onSelectTab: (tab: DemoTab): void => dispatch({ type: 'select-tab', tab }),
    onBack: (): void => dispatch({ type: 'back' }),
  }

  const onMarkPrayer = (prayer: Prayer): void => {
    // Decide before the state change re-renders: it needs this render's
    // target, not the one the mark is about to produce.
    const wasCoachTarget = coachMarkIsTarget(state.coachStep, today, prayer)
    dispatch({ type: 'mark-prayer', prayer, at: new Date(), wasCoachTarget })
  }

  const ignore = (): void => undefined
  let title: string
  let showBack = false
  let screen: ReactNode

  if (state.view === 'today') {
    title = today.title
    screen = (
      <TodayScreen
        {...today.props}
        onMarkPrayer={onMarkPrayer}
        onUseMyLocation={ignore}
        onAddSuggestion={ignore}
        onDismissSuggestion={ignore}
        onMakeUp={ignore}
        onRecordFastOwed={ignore}
        onUndoFastOwed={ignore}
      />
    )
  } else if (state.view === 'library') {
    title = strings.library.title
    screen = (
      <LibraryScreen
        {...buildLibrary(state.libraryQuery, state.libraryFilter, state.enabled, strings)}
        onFilterChange={(filter) => dispatch({ type: 'library-filter', filter })}
      />
    )
  } else if (state.view === 'item') {
    const id = state.selectedItemId
    const props = buildItem(
      { id, signals, count: state.count, remind: state.remind, enabled: state.enabled },
      strings,
    )
    const shareText = (): void => {
      const text = id ? shareTextFor(id, strings) : null
      if (text) share(text)
    }
    title = props.title
    showBack = true
    screen = (
      <ItemScreen
        {...props}
        onToggleDone={() => {
          if (id) dispatch({ type: 'toggle-done', id, at: new Date() })
        }}
        onTapCounter={() => {
          if (id && props.counter)
            dispatch({ type: 'tap-counter', id, target: props.counter.target, at: new Date() })
        }}
        onResetCounter={() => dispatch({ type: 'reset-counter' })}
        onToggleOnToday={() => {
          if (id) dispatch({ type: 'toggle-on-today', id })
        }}
        onToggleRemind={(value) => {
          if (id) dispatch({ type: 'toggle-remind', id, value })
        }}
        onShareText={shareText}
        onShareImage={shareText}
      />
    )
  } else {
    title = strings.more.title
    screen = <MoreScreen groups={buildMore(strings, language, placeLabel)} />
  }

  return (
    <div className="demo-phone" id="demo-phone" lang={locale.lang} dir={locale.dir}>
      <div className="demo-phone-screen">
        <StatusBar time={statusBarTime(now)} />
        <Nav
          title={title}
          showBack={showBack}
          strings={strings}
          handlers={handlers}
          search={
            state.view === 'library'
              ? {
                  value: state.libraryQuery,
                  placeholder: strings.library.search,
                  onChange: (query) => dispatch({ type: 'library-query', query }),
                }
              : undefined
          }
        />
        <div className="demo-content" ref={contentRef}>
          <UiProvider value={uiFor(strings, scheme, linkRef.current)}>{screen}</UiProvider>
        </div>
        <div className="demo-tabbar-wrap">
          <div className="demo-tabbar" ref={tabbarRef}>
            <TabBar
              active={activeTab}
              strings={strings}
              tabsLabel={copy.tabsLabel}
              handlers={handlers}
            />
          </div>
          <div className="demo-gesture-handle" aria-hidden="true" />
        </div>
      </div>

      {state.view === 'today' ? (
        <CoachOverlay
          contentRef={contentRef}
          tabbarRef={tabbarRef}
          step={state.coachStep}
          today={today}
          copy={copy}
        />
      ) : null}
    </div>
  )
}
