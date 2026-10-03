import { afterEach, beforeEach, describe, expect, it, mock, setSystemTime } from 'bun:test'
import { DEFAULT_USER_STATE } from '@ihsaanly/core/plan/user-state'
import { en } from '@ihsaanly/core/strings/en'
import { act, cleanup } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { renderScreen } from '../../../../../packages/ui/test/render'
import { actAsync } from '../../../test/library'
import { resetRouter, router } from '../../../test/router'

type TodayProps = ComponentProps<typeof import('@ihsaanly/ui/screens/today').TodayScreen>

const todayProps: TodayProps[] = []
mock.module('@ihsaanly/ui/screens/today', () => ({
  TodayScreen: (props: TodayProps): ReactElement => {
    todayProps.push(props)
    return <div data-testid="today-screen" />
  },
}))

interface Fix {
  coords: { latitude: number; longitude: number }
}
const location = {
  granted: true,
  throwOnPermission: false,
  lastKnown: null as Fix | null,
  current: { coords: { latitude: 51.5, longitude: -0.12 } } as Fix,
  address: [{ city: 'London', region: 'England', country: 'UK' }] as Record<string, string>[],
  /** When set, the permission request waits for this before answering. */
  gate: null as Promise<void> | null,
}
mock.module('expo-location', () => ({
  Accuracy: { Low: 2 },
  requestForegroundPermissionsAsync: async () => {
    await location.gate
    if (location.throwOnPermission) throw new Error('services off')
    return { granted: location.granted }
  },
  getLastKnownPositionAsync: async () => location.lastKnown,
  getCurrentPositionAsync: async () => location.current,
  reverseGeocodeAsync: async () => location.address,
}))

const { default: TodayRoute } = await import('../../app/(home)/index')
const { setLocale, getLocale } = await import('@ihsaanly/state/i18n/store')
const { setPlace, getPlace } = await import('@ihsaanly/state/location/store')
const { setOnboarding, DEFAULT_ONBOARDING } = await import('@ihsaanly/state/onboarding/store')
const { setSuggestion, getSuggestion } = await import('@ihsaanly/state/plan/suggestion-store')
const { setUserState } = await import('@ihsaanly/state/plan/user-state-store')
const { setEnabledItems, getEnabledItems, defaultEnabled } = await import(
  '@ihsaanly/state/plan/enabled-store'
)
const { setBacklog } = await import('@ihsaanly/state/prayer/backlog-store')
const { configureProgress, getItemProgress } = await import('@ihsaanly/state/progress/store')
const { getTodayHints } = await import('@ihsaanly/state/today/hints')
const { TODAY_HINTS_KEY } = await import('@ihsaanly/state/cloud/keys')
const { writePreference } = await import('@ihsaanly/state/storage/preferences')
const { reloadPreferences } = await import('@ihsaanly/state/storage/preference-store')

function setHints(tourSeen: boolean): void {
  writePreference(TODAY_HINTS_KEY, { tourSeen, prayersMarked: 0 })
  reloadPreferences()
}
const { resumeTracking, getUserState } = await import('@ihsaanly/state/plan/user-state-store')
const { DEFAULT_SUGGESTION } = await import('@ihsaanly/core/plan/suggest')

const LONDON = {
  label: 'London, England, UK',
  latitude: 51.5074,
  longitude: -0.1278,
  timeZone: 'Europe/London',
  source: 'city',
} as const

/** A Friday in Ramadan 2026, just after the Dhuhr window opened in London. */
const RAMADAN_FRIDAY = new Date('2026-03-06T12:30:00Z')
/** An ordinary Wednesday outside Ramadan. */
const ORDINARY_WEDNESDAY = new Date('2026-10-07T12:30:00Z')

/** Friday evening in London: the evening adhkar and the last hour are open. */
const FRIDAY_EVENING = new Date('2026-03-06T17:30:00Z')

const last = (): TodayProps => {
  const props = todayProps.at(-1)
  if (!props) throw new Error('TodayScreen did not render')
  return props
}

function open(at: Date = RAMADAN_FRIDAY, withPlace = true): void {
  setSystemTime(at)
  act(() => setPlace(withPlace ? LONDON : null))
  renderScreen(<TodayRoute />)
}

const initialLocale = getLocale()

beforeEach(() => {
  act(() => setLocale('en-US'))
  todayProps.length = 0
  location.granted = true
  location.throwOnPermission = false
  location.lastKnown = null
  location.gate = null
  location.address = [{ city: 'London', region: 'England', country: 'UK' }]
  act(() => {
    setSuggestion(DEFAULT_SUGGESTION)
    setOnboarding(DEFAULT_ONBOARDING)
  })
})

afterEach(() => {
  setSystemTime()
  act(() => {
    setLocale(initialLocale)
    setPlace(null)
    setSuggestion(DEFAULT_SUGGESTION)
    setOnboarding(DEFAULT_ONBOARDING)
    setUserState(DEFAULT_USER_STATE)
    setEnabledItems(defaultEnabled())
  })
})

describe('without a location', () => {
  it('asks for one and shows no plan', () => {
    open(RAMADAN_FRIDAY, false)
    const props = last()
    expect(props.hasLocation).toBe(false)
    expect(props.placeLabel).toBeNull()
    expect(props.hijri).toBeNull()
    expect(props.next).toBeNull()
    expect(props.now).toEqual([])
    expect(props.prayers).toEqual([])
    expect(props.jumuah).toBe(false)
    expect(props.suggestion).toBeNull()
    expect(props.locationHref).toBe('/location')
    expect(props.qadaHref).toBe('/qada')
    expect(router.screens).toEqual([{ title: en.today.title }])
  })

  it('formats the date in UTC and still offers the Ramadan fast', () => {
    open(RAMADAN_FRIDAY, false)
    expect(last().gregorian).toBe('Fri, Mar 6')
    expect(last().fastingToday).toEqual({ recorded: false })
  })

  it('ignores a prayer tap and a make-up tap', () => {
    open(RAMADAN_FRIDAY, false)
    act(() => last().onMarkPrayer('dhuhr'))
    act(() => last().onMakeUp('dhuhr'))
    expect(last().prayers).toEqual([])
  })
})

describe('asking the device for its location', () => {
  it('stores the place it finds and clears the spinner', async () => {
    open(RAMADAN_FRIDAY, false)
    await actAsync(() => last().onUseMyLocation())
    expect(getPlace()?.label).toBe('London, England, UK')
    expect(getPlace()?.source).toBe('device')
    expect(last().hasLocation).toBe(true)
    expect(last().locating).toBe(false)
    expect(last().locationProblem).toBeNull()
  })

  it('says it is locating while it waits', async () => {
    let release: () => void = () => {}
    location.gate = new Promise<void>((resolve) => {
      release = resolve
    })
    open(RAMADAN_FRIDAY, false)
    act(() => last().onUseMyLocation())
    expect(last().locating).toBe(true)
    expect(last().locationProblem).toBeNull()
    await actAsync(() => release())
    expect(last().locating).toBe(false)
  })

  it('names a declined permission', async () => {
    location.granted = false
    open(RAMADAN_FRIDAY, false)
    await actAsync(() => last().onUseMyLocation())
    expect(last().locationProblem).toBe('declined')
    expect(last().locating).toBe(false)
    expect(getPlace()).toBeNull()
  })

  it('names an unavailable fix', async () => {
    location.current = undefined as unknown as Fix
    open(RAMADAN_FRIDAY, false)
    await actAsync(() => last().onUseMyLocation())
    expect(last().locationProblem).toBe('unavailable')
    location.current = { coords: { latitude: 51.5, longitude: -0.12 } }
  })

  it('never stays on Finding you when the platform throws', async () => {
    location.throwOnPermission = true
    open(RAMADAN_FRIDAY, false)
    await actAsync(() => last().onUseMyLocation())
    expect(last().locating).toBe(false)
    expect(last().locationProblem).toBe('unavailable')
  })
})

describe('with a location', () => {
  it('labels the place by its first part and plans the day', () => {
    open()
    const props = last()
    expect(props.hasLocation).toBe(true)
    expect(props.placeLabel).toBe('London')
    expect(props.gregorian).toBe('Fri, Mar 6')
    expect(props.hijri).not.toBeNull()
    expect(props.jumuah).toBe(true)
    expect(props.prayers.map((entry) => entry.prayer)).toEqual([
      'fajr',
      'dhuhr',
      'asr',
      'maghrib',
      'isha',
    ])
    expect(props.next).not.toBeNull()
  })

  it("titles the screen with the open window, naming Dhuhr on Friday Jumu'ah", () => {
    open()
    expect(router.screens.at(-1)).toEqual({ title: en.window.jumuah })
  })

  it('titles the screen with the plain window name on other days', () => {
    open(ORDINARY_WEDNESDAY)
    expect(last().jumuah).toBe(false)
    expect(router.screens.at(-1)).toEqual({ title: en.window.dhuhr })
  })

  it('has no Ramadan fast row outside Ramadan', () => {
    open(ORDINARY_WEDNESDAY)
    expect(last().fastingToday).toBeNull()
  })

  it('marks the prayers whose window closed today as passed', () => {
    open()
    const byPrayer = Object.fromEntries(last().prayers.map((entry) => [entry.prayer, entry]))
    expect(byPrayer.fajr?.passed).toBe(true)
    expect(byPrayer.dhuhr?.passed).toBe(false)
    expect(byPrayer.isha?.passed).toBe(false)
  })

  it('marks and unmarks a prayer', () => {
    open()
    const done = (): boolean | undefined =>
      last().prayers.find((entry) => entry.prayer === 'dhuhr')?.done
    expect(done()).toBe(false)
    act(() => last().onMarkPrayer('dhuhr'))
    expect(done()).toBe(true)
    act(() => last().onMarkPrayer('dhuhr'))
    expect(done()).toBe(false)
  })

  it('marks a prayer whose window has not opened yet', () => {
    open()
    act(() => last().onMarkPrayer('isha'))
    expect(last().prayers.find((entry) => entry.prayer === 'isha')?.done).toBe(true)
    act(() => last().onMarkPrayer('isha'))
  })

  it('shows no prayer rows while tracking is paused', () => {
    act(() => setUserState({ ...DEFAULT_USER_STATE, trackingPaused: true }))
    open()
    expect(last().prayers).toEqual([])
  })

  it('lists what is owed and pays one back', () => {
    act(() => setBacklog('asr', 2))
    open()
    expect(last().qada.find((entry) => entry.prayer === 'asr')?.count).toBe(2)
    act(() => last().onMakeUp('asr'))
    expect(last().qada.find((entry) => entry.prayer === 'asr')?.count).toBe(1)
    act(() => setBacklog('asr', 0))
  })

  it('records and takes back an owed Ramadan fast', () => {
    open()
    const owed = last().fastsOwed
    expect(last().fastingToday).toEqual({ recorded: false })
    act(() => last().onRecordFastOwed())
    expect(last().fastingToday).toEqual({ recorded: true })
    expect(last().fastsOwed).toBe(owed + 1)
    act(() => last().onUndoFastOwed())
    expect(last().fastingToday).toEqual({ recorded: false })
    expect(last().fastsOwed).toBe(owed)
  })
})

describe('the weekly suggestion', () => {
  it('offers one item not yet on Today and remembers when it was shown', () => {
    open()
    const offered = last().suggestion
    expect(offered).not.toBeNull()
    expect(offered?.href).toBe(`/item/${offered?.id}`)
    expect(offered?.title.length).toBeGreaterThan(0)
    expect(getEnabledItems()).not.toContain(offered?.id)
    expect(getSuggestion().itemId).toBe(offered?.id ?? null)
    expect(getSuggestion().shownAt).toBe(RAMADAN_FRIDAY.toISOString())
  })

  it('holds fasting back for the first three weeks and offers it once settled', async () => {
    const { items } = await import('@ihsaanly/core/content')
    const offerable = ['fast-dhul-hijjah', 'duha-prayer']
    const rest = items.filter((item) => !offerable.includes(item.id))
    act(() => setEnabledItems(rest.map((item) => item.id)))
    open(ORDINARY_WEDNESDAY)
    const early = last().suggestion?.id
    cleanup()
    todayProps.length = 0

    act(() => {
      setSuggestion(DEFAULT_SUGGESTION)
      setOnboarding({
        completed: true,
        gender: 'unspecified',
        completedAt: new Date(ORDINARY_WEDNESDAY.getTime() - 30 * 86_400_000).toISOString(),
      })
    })
    open(ORDINARY_WEDNESDAY)
    const settled = last().suggestion?.id
    expect(early).toBe('duha-prayer')
    expect(settled).toBe('fast-dhul-hijjah')
  })

  it('adds the suggestion to Today', () => {
    open()
    const id = last().suggestion?.id ?? ''
    act(() => last().onAddSuggestion(id))
    expect(getEnabledItems()).toContain(id)
  })

  it('dismisses the suggestion and offers a different one', () => {
    open()
    const id = last().suggestion?.id ?? ''
    act(() => last().onDismissSuggestion(id))
    expect(getSuggestion().dismissed).toEqual([id])
    expect(last().suggestion?.id).not.toBe(id)
  })

  it('offers nothing once every item is on Today', async () => {
    const { items } = await import('@ihsaanly/core/content')
    act(() => setEnabledItems(items.map((item) => item.id)))
    open()
    expect(last().suggestion).toBeNull()
  })
})

describe('sunnah rows', () => {
  let resetProgress: () => void = () => {}
  const ids = (list: { id: string }[]): string[] => list.map((entry) => entry.id)

  beforeEach(() => {
    resetProgress = configureProgress({ periodOf: () => 'test-period' })
    act(() => {
      setHints(true)
      setEnabledItems([...defaultEnabled(), 'istighfar'])
    })
  })

  afterEach(() => {
    resetProgress()
    resetRouter()
    act(() => {
      resumeTracking()
      setHints(true)
    })
  })

  it('moves a single-tap item to Done today and brings it back on undo', () => {
    open(FRIDAY_EVENING)
    expect(ids(last().now)).toContain('friday-last-hour')
    act(() => last().onCircle('friday-last-hour'))
    expect(last().undo?.title.length).toBeGreaterThan(0)
    expect(ids(last().now)).not.toContain('friday-last-hour')
    expect(ids(last().doneToday)).toContain('friday-last-hour')
    act(() => last().undo?.onUndo())
    expect(ids(last().now)).toContain('friday-last-hour')
    expect(last().undo).toBeNull()
  })

  it('unmarks a done item with another tap and can dismiss the undo bar', () => {
    open(FRIDAY_EVENING)
    act(() => last().onCircle('friday-last-hour'))
    act(() => last().onDismissUndo())
    expect(last().undo).toBeNull()
    act(() => last().onCircle('friday-last-hour'))
    expect(ids(last().now)).toContain('friday-last-hour')
  })

  it('counts a dhikr in its panel until it finishes', () => {
    open(FRIDAY_EVENING)
    act(() => last().onCircle('istighfar'))
    const panel = last().panel
    expect(panel?.kind).toBe('count')
    const target = panel?.kind === 'count' ? panel.target : 0
    for (let i = 0; i < target - 1; i += 1) act(() => last().onCount('istighfar'))
    expect(last().panel?.kind).toBe('count')
    act(() => last().onCount('istighfar'))
    expect(last().panel).toBeNull()
    expect(last().undo).not.toBeNull()
  })

  it('completes a counted dhikr early and closes its panel', () => {
    open(FRIDAY_EVENING)
    act(() => last().onCircle('istighfar'))
    act(() => last().onComplete('istighfar'))
    expect(last().panel).toBeNull()
    expect(last().undo).not.toBeNull()
    act(() => last().onClosePanel())
  })

  it('ticks the parts of the evening adhkar, or marks them all', () => {
    open(FRIDAY_EVENING)
    act(() => last().onCircle('evening-adhkar'))
    const panel = last().panel
    expect(panel?.kind).toBe('parts')
    const first = panel?.kind === 'parts' ? (panel.parts[0]?.id ?? '') : ''
    act(() => last().onTogglePart('evening-adhkar', first))
    expect(getItemProgress('evening-adhkar').parts).toEqual([first])
    act(() => last().onTogglePart('evening-adhkar', first))
    expect(getItemProgress('evening-adhkar').parts).toEqual([])
    act(() => last().onMarkAll('evening-adhkar'))
    expect(ids(last().doneToday)).toContain('evening-adhkar')
  })

  it('shows the prayer hint until three prayers are marked, and not again', () => {
    open(new Date(RAMADAN_FRIDAY.getTime() + 3_600_000))
    expect(last().prayerHint).toBe(true)
    for (const prayer of ['fajr', 'dhuhr', 'asr'] as const) {
      act(() => last().onMarkPrayer(prayer))
    }
    expect(getTodayHints().prayersMarked).toBe(3)
    expect(last().prayerHint).toBe(false)
    act(() => last().onMarkPrayer('isha'))
    expect(getTodayHints().prayersMarked).toBe(3)
    for (const prayer of ['fajr', 'dhuhr', 'asr', 'isha'] as const) {
      if (last().prayers.find((entry) => entry.prayer === prayer)?.done) {
        act(() => last().onMarkPrayer(prayer))
      }
    }
  })

  // Marks are ordered by time, so a test after another's marks needs a later instant.
  it('does not count unmarking a prayer', () => {
    open(new Date(RAMADAN_FRIDAY.getTime() + 7_200_000))
    act(() => last().onMarkPrayer('dhuhr'))
    act(() => last().onMarkPrayer('dhuhr'))
    expect(getTodayHints().prayersMarked).toBe(1)
  })

  it('tours first-run, moves on when a prayer is marked, and ends with Skip', () => {
    act(() => {
      setOnboarding({ completed: true, gender: 'unspecified' })
      setHints(false)
    })
    open()
    expect(last().tour?.step).toBe(0)
    act(() => last().onMarkPrayer('dhuhr'))
    expect(last().tour?.step).toBe(1)
    act(() => last().tour?.onSkip())
    expect(last().tour).toBeNull()
    expect(getTodayHints().tourSeen).toBe(true)
    expect(router.calls).toContainEqual(['setParams', { tour: undefined }])
  })

  it('replays the tour from ?tour=1 even once seen', () => {
    router.params = { tour: '1' }
    open()
    expect(last().tour?.step).toBe(0)
    act(() => last().tour?.onNext())
    expect(last().tour?.step).toBe(1)
  })

  it('shows the pause notice and a check-in that resumes or waits', () => {
    act(() =>
      setUserState({
        ...DEFAULT_USER_STATE,
        trackingPaused: true,
        pauseCheckInOn: '2026-03-01',
      }),
    )
    open()
    expect(last().paused).toBe(true)
    expect(last().prayerHint).toBe(false)
    expect(last().checkIn).not.toBeNull()
    act(() => last().checkIn?.onNotYet())
    expect(getUserState().pauseCheckInOn).toBe('2026-03-07')
    expect(last().checkIn).toBeNull()
    act(() => setUserState({ ...getUserState(), pauseCheckInOn: '2026-03-01' }))
    act(() => last().checkIn?.onResume())
    expect(getUserState().trackingPaused).toBe(false)
    expect(last().paused).toBe(false)
  })
})
