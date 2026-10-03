import { itemById, resolveText } from '@ihsaanly/core/content'
import { civilDateIn, civilDateKey } from '@ihsaanly/core/day/boundaries'
import { isRamadanDay } from '@ihsaanly/core/fasting/ledger'
import { windowName } from '@ihsaanly/core/plan/jumuah'
import { plan } from '@ihsaanly/core/plan/plan'
import { type Phase, SUGGESTION_INTERVAL_MS, suggest } from '@ihsaanly/core/plan/suggest'
import { PRAYERS, type Prayer } from '@ihsaanly/core/prayer/qada'
import { prayerTimesAcross } from '@ihsaanly/core/prayer/times'
import { buildWindows } from '@ihsaanly/core/prayer/windows'
import {
  clearFastOwed,
  recordFastOwed,
  useFastOwedOn,
  useFastsOutstanding,
} from '@ihsaanly/state/fasting/store'
import { useHijriOffset } from '@ihsaanly/state/hijri/store'
import { useLocale } from '@ihsaanly/state/i18n/store'
import { setPlace, usePlace } from '@ihsaanly/state/location/store'
import { useOnboarding } from '@ihsaanly/state/onboarding/store'
import { setEnabledItems, useEnabledItems } from '@ihsaanly/state/plan/enabled-store'
import { setSuggestion, useSuggestion } from '@ihsaanly/state/plan/suggestion-store'
import { useSignals } from '@ihsaanly/state/plan/use-plan'
import {
  markMadeUp,
  markPrayer,
  unmarkPrayer,
  useQada,
  useTodayMarks,
} from '@ihsaanly/state/prayer/marks'
import { useCalculationPreferences } from '@ihsaanly/state/prayer/store'
import { useStrings } from '@ihsaanly/state/strings'
import { useNow } from '@ihsaanly/state/time/use-now'
import { useTodaySunnah } from '@ihsaanly/state/today/use-today-sunnah'
import { onMakeUpFor } from '@ihsaanly/ui/props/today'
import type { LocationProblem } from '@ihsaanly/ui/screens/onboarding'
import { type SuggestionEntry, TodayScreen } from '@ihsaanly/ui/screens/today'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { type ReactElement, useEffect, useState } from 'react'
import { PageHeader } from '~/components/page-header'
import { requestDeviceLocation } from '~/platform/location'

interface TodaySearch {
  tour?: 1
}

export const Route = createFileRoute('/today')({
  component: TodayRoute,
  // More → "Show me around" links to /today?tour=1.
  validateSearch: (search: Record<string, unknown>): TodaySearch =>
    search.tour === 1 || search.tour === '1' ? { tour: 1 } : {},
})

interface Thing {
  locating: boolean
  problem: LocationProblem
}

function TodayRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ locating: false, problem: null })
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const now = useNow()
  const signals = useSignals()
  const planned = signals ? plan(signals) : null
  const marks = useTodayMarks(place?.timeZone ?? 'UTC', now)
  const qada = useQada()
  const strings = useStrings()
  const onboarding = useOnboarding()
  const suggestion = useSuggestion()
  const enabled = useEnabledItems()
  const locale = useLocale()
  const timeZone = place?.timeZone ?? 'UTC'
  const civilDay = (instant: Date): string => instant.toLocaleDateString('en-CA', { timeZone })
  const hijriOffset = useHijriOffset()
  const fastsOwed = useFastsOutstanding()
  const todayCivil = civilDateIn(now, timeZone)
  const fastOwedToday = useFastOwedOn(civilDateKey(todayCivil))
  const ramadan = isRamadanDay(todayCivil, hijriOffset)
  const windows = place ? buildWindows(prayerTimesAcross(place, now, preferences)) : []
  const passed = (prayer: Prayer): boolean =>
    windows.some(
      (entry) =>
        entry.name === prayer && entry.endsAt <= now && civilDay(entry.startsAt) === civilDay(now),
    )
  const window = planned?.today.window ?? null
  const navigate = useNavigate()
  const { notePrayerMarked, ...sunnah } = useTodaySunnah({
    planned,
    strings,
    now,
    timeZone,
    replayTour: Route.useSearch().tour === 1,
    onTourEnd: () => void navigate({ to: '/today', search: {}, replace: true }),
  })

  const phase: Phase =
    onboarding.completedAt &&
    now.getTime() - new Date(onboarding.completedAt).getTime() > 3 * SUGGESTION_INTERVAL_MS
      ? 'settled'
      : 'early'
  const suggestedId = signals ? suggest(signals, suggestion, phase) : null

  useEffect(() => {
    if (suggestedId && suggestedId !== suggestion.itemId) {
      setSuggestion({ ...suggestion, shownAt: now.toISOString(), itemId: suggestedId })
    }
  }, [suggestedId, suggestion, now])

  const suggested = ((): SuggestionEntry | null => {
    const item = suggestedId ? itemById(suggestedId) : undefined
    if (!item) return null
    return {
      id: item.id,
      title: resolveText(item.title) ?? item.id,
      why: resolveText(item.why) ?? resolveText(item.translation),
      href: `/item/${item.id}`,
    }
  })()

  const useMyLocation = (): void => {
    setThing({ locating: true, problem: null })
    requestDeviceLocation()
      .then((located) => {
        if (located.status === 'ok') {
          setPlace(located.place)
          setThing({ locating: false, problem: null })
          return
        }
        setThing({ locating: false, problem: located.status })
      })
      .catch(() => {
        setThing({ locating: false, problem: 'unavailable' })
      })
  }

  const togglePrayer = (prayer: Prayer): void => {
    if (!place) return
    if (marks[prayer]) {
      unmarkPrayer(prayer, now, place.timeZone)
      return
    }
    const current = windows.filter((entry) => entry.name === prayer && entry.startsAt <= now).pop()
    markPrayer(prayer, now, place.timeZone, current)
    notePrayerMarked()
  }

  return (
    <>
      <PageHeader
        title={
          window ? windowName(strings, window, planned?.today.jumuah ?? false) : strings.today.title
        }
        back={false}
      />
      <TodayScreen
        hasLocation={place !== null}
        locating={thing.locating}
        locationProblem={thing.problem}
        onUseMyLocation={useMyLocation}
        jumuah={planned?.today.jumuah ?? false}
        gregorian={new Intl.DateTimeFormat(locale, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone,
        }).format(now)}
        hijri={planned?.today.hijri ?? null}
        placeLabel={place ? (place.label.split(',')[0]?.trim() ?? place.label) : null}
        {...sunnah}
        prayers={
          place && !signals?.userState.trackingPaused
            ? PRAYERS.map((prayer) => ({
                prayer,
                done: marks[prayer] !== undefined,
                passed: passed(prayer),
              }))
            : []
        }
        qada={Object.entries(qada).map(([prayer, count]) => ({
          prayer: prayer as Prayer,
          count: count ?? 0,
        }))}
        onMarkPrayer={togglePrayer}
        onMakeUp={onMakeUpFor(place?.timeZone, now, markMadeUp)}
        fastingToday={ramadan && !sunnah.paused ? { recorded: fastOwedToday } : null}
        fastsOwed={fastsOwed}
        onRecordFastOwed={() => recordFastOwed(now, timeZone)}
        onUndoFastOwed={() => clearFastOwed(now, timeZone)}
        suggestion={suggested}
        onAddSuggestion={(id) => setEnabledItems([...enabled, id])}
        onDismissSuggestion={(id) =>
          setSuggestion({ ...suggestion, dismissed: [...suggestion.dismissed, id] })
        }
        qadaHref="/qada"
        locationHref="/location"
      />
    </>
  )
}
