import { useEffect, useState, type ReactElement } from 'react'

import { itemById, resolveText } from '@/content'
import { requestDeviceLocation } from '@/location/device'
import { setPlace, usePlace } from '@/location/store'
import type { NextPrayer, PlannedItem } from '@/plan/signals'
import { useNotificationSync } from '@/notifications/use-sync'
import { useWidgetSnapshot } from '@/widgets/use-snapshot'
import { useOnboarding } from '@/onboarding/store'
import { setEnabledItems, useEnabledItems } from '@/plan/enabled-store'
import { plan } from '@/plan/plan'
import { suggest, SUGGESTION_INTERVAL_MS, type Phase } from '@/plan/suggest'
import { setSuggestion, useSuggestion } from '@/plan/suggestion-store'
import { useSignals } from '@/plan/use-plan'
import { markMadeUp, markPrayer, unmarkPrayer, useQada, useTodayMarks } from '@/prayer/marks'
import { PRAYERS, type Prayer } from '@/prayer/qada'
import { useCalculationPreferences } from '@/prayer/store'
import { prayerTimesAcross } from '@/prayer/times'
import { buildWindows } from '@/prayer/windows'
import type { LocationProblem } from '@/screens/onboarding'
import {
  TodayScreen,
  type NextPrayerEntry,
  type SuggestionEntry,
  type TodayEntry,
} from '@/screens/today'
import { useStrings, type Strings } from '@/strings'
import { useNow } from '@/time/use-now'

function caveatLabel(caveat: PlannedItem['caveat'], strings: Strings): string | null {
  if (caveat === 'confirm-locally') return strings.plan.confirmLocally
  if (caveat === 'expected') return strings.plan.expected
  return null
}

function whenLabel(planned: PlannedItem, strings: Strings): string | null {
  if (planned.reason !== 'upcoming') return null
  return planned.daysAway === 1 ? strings.plan.tomorrow : strings.plan.inDays(planned.daysAway ?? 0)
}

function detailFor(planned: PlannedItem, strings: Strings, showWhen: boolean): string | null {
  const parts = [
    showWhen ? whenLabel(planned, strings) : null,
    planned.optional ? strings.plan.optional : null,
    caveatLabel(planned.caveat, strings),
  ].filter((part): part is string => part !== null)

  return parts.length > 0 ? parts.join(' · ') : null
}

/** A rough distance, never a clock time: the app says how the day feels, not when it ticks. */
function distanceLabel(minutes: number, strings: Strings): string {
  if (minutes < 45) return strings.plan.soon
  if (minutes < 90) return strings.plan.inAboutAnHour
  return strings.plan.inAboutHours(Math.round(minutes / 60))
}

function itemEntry(id: string): TodayEntry | null {
  const item = itemById(id)
  return item
    ? { id, title: resolveText(item.title) ?? id, detail: null, href: `/item/${id}` }
    : null
}

function toNext(next: NextPrayer | null, now: Date, strings: Strings): NextPrayerEntry | null {
  if (!next) return null
  return {
    prayer: next.prayer,
    distance: distanceLabel((next.startsAt.getTime() - now.getTime()) / 60_000, strings),
    before: next.before.flatMap((id) => itemEntry(id) ?? []),
    after: next.after.flatMap((id) => itemEntry(id) ?? []),
  }
}

function toEntry(planned: PlannedItem, strings: Strings, showWhen = true): TodayEntry | null {
  const item = itemById(planned.itemId)
  if (!item) return null

  return {
    id: planned.itemId,
    title: resolveText(item.title) ?? item.id,
    detail: detailFor(planned, strings, showWhen),
    href: `/item/${item.id}`,
  }
}

/**
 * The plan returns today's all-day items and the look-ahead in one list. They
 * are different questions — what to do today, and what to prepare for — so
 * they are split here rather than shown under one caption that reads as
 * "not now".
 */
function split(entries: PlannedItem[]): {
  allDay: PlannedItem[]
  tomorrow: PlannedItem[]
  later: PlannedItem[]
} {
  return {
    allDay: entries.filter((entry) => entry.reason === 'today'),
    tomorrow: soonestEach(
      entries.filter((entry) => entry.reason === 'upcoming' && entry.daysAway === 1),
    ),
    later: soonestEach(
      entries.filter((entry) => entry.reason === 'upcoming' && (entry.daysAway ?? 0) > 1),
    ),
  }
}

/**
 * The White Days are three consecutive days, so the look-ahead returns the
 * same item once per day. Three identical rows say nothing the first does, and
 * they collide as React keys, so only the soonest is kept.
 */
function soonestEach(entries: PlannedItem[]): PlannedItem[] {
  const soonest = new Map<string, PlannedItem>()

  for (const entry of entries) {
    const seen = soonest.get(entry.itemId)
    if (!seen || (entry.daysAway ?? 0) < (seen.daysAway ?? 0)) soonest.set(entry.itemId, entry)
  }

  return [...soonest.values()].sort((a, b) => (a.daysAway ?? 0) - (b.daysAway ?? 0))
}

interface Thing {
  locating: boolean
  problem: LocationProblem
}

export default function TodayRoute(): ReactElement {
  const [thing, setThing] = useState<Thing>({ locating: false, problem: null })
  const place = usePlace()
  const preferences = useCalculationPreferences()
  const now = useNow()
  const signals = useSignals()
  const planned = signals ? plan(signals) : null
  useNotificationSync(planned)
  useWidgetSnapshot(planned)
  const marks = useTodayMarks(place?.timeZone ?? 'UTC', now)
  const qada = useQada()
  const strings = useStrings()
  const ahead = split(planned?.today.comingUp ?? [])
  const onboarding = useOnboarding()
  const suggestion = useSuggestion()
  const enabled = useEnabledItems()

  // Three weeks of settling before fasting is offered; missing means an
  // install from before the date was recorded, treated as early.
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

  /** The empty state asks for the permission itself rather than sending someone
   * to settings to find it. Declining is a named outcome, not a failure. */
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
        // Whatever the platform threw, the button must not stay on "Finding you".
        setThing({ locating: false, problem: 'unavailable' })
      })
  }

  const togglePrayer = (prayer: Prayer): void => {
    if (!place) return

    if (marks[prayer]) {
      unmarkPrayer(prayer, now, place.timeZone)
      return
    }

    const windows = buildWindows(prayerTimesAcross(place, now, preferences))
    const current = windows.filter((entry) => entry.name === prayer && entry.startsAt <= now).pop()

    markPrayer(prayer, now, place.timeZone, current)
  }

  return (
    <TodayScreen
      hasLocation={place !== null}
      locating={thing.locating}
      locationProblem={thing.problem}
      onUseMyLocation={useMyLocation}
      window={planned?.today.window ?? null}
      hijri={planned?.today.hijri ?? null}
      placeLabel={place ? (place.label.split(',')[0]?.trim() ?? place.label) : null}
      now={planned?.today.now.flatMap((entry) => toEntry(entry, strings) ?? []) ?? []}
      next={toNext(planned?.today.next ?? null, now, strings)}
      allDay={ahead.allDay.flatMap((entry) => toEntry(entry, strings, false) ?? [])}
      tomorrow={ahead.tomorrow.flatMap((entry) => toEntry(entry, strings, false) ?? [])}
      later={ahead.later.flatMap((entry) => toEntry(entry, strings) ?? [])}
      prayers={
        place && !signals?.userState.trackingPaused
          ? PRAYERS.map((prayer) => ({ prayer, done: marks[prayer] !== undefined }))
          : []
      }
      qada={Object.entries(qada).map(([prayer, count]) => ({
        prayer: prayer as Prayer,
        count: count ?? 0,
      }))}
      onMarkPrayer={togglePrayer}
      onMakeUp={onMakeUpFor(place?.timeZone, now)}
      suggestion={suggested}
      onAddSuggestion={(id) => setEnabledItems([...enabled, id])}
      onDismissSuggestion={(id) =>
        setSuggestion({ ...suggestion, dismissed: [...suggestion.dismissed, id] })
      }
      qadaHref="/qada"
      locationHref="/location"
    />
  )
}

function onMakeUpFor(timeZone: string | undefined, now: Date): (prayer: Prayer) => void {
  return (prayer) => {
    if (timeZone) markMadeUp(prayer, now, timeZone)
  }
}
