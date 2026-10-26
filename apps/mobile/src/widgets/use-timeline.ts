import { items } from '@ihsaanly/core/content'
import { isRightToLeft } from '@ihsaanly/core/i18n/locale'
import type { Plan, Signals } from '@ihsaanly/core/plan/signals'
import { useFastsOutstanding } from '@ihsaanly/state/fasting/store'
import { useHijriOffset } from '@ihsaanly/state/hijri/store'
import { useLocale } from '@ihsaanly/state/i18n/store'
import { useOwnDuas, usePinnedItems } from '@ihsaanly/state/my-duas/store'
import { useQada } from '@ihsaanly/state/prayer/marks'
import { getItemProgress, useProgressRevision } from '@ihsaanly/state/progress/store'
import { useReaderPreferences } from '@ihsaanly/state/reader/store'
import { useStrings } from '@ihsaanly/state/strings'
import { useAccent } from '@ihsaanly/state/theme/accent-store'
import { useEffect } from 'react'
import { AppState } from 'react-native'

import { takeWidgetTaps, useWidgetTapsThrough } from './drain'
import { type WidgetInput, widgetTimeline } from './model'
import { publishTimeline } from './publish'
import { onWidgetTap } from './taps'

/**
 * Counted items (the tasbih): what the widget's +1 counts on top of. Read at
 * each republish rather than watched, so counting in the app does not
 * rebuild the widgets' day on every tap; taking widget counts in republishes.
 */
const COUNTED = items.filter((item) => item.repeat > 1 && (item.parts ?? []).length === 0)

export function widgetCounts(): Partial<Record<string, number>> {
  return Object.fromEntries(
    COUNTED.map((item) => [item.id, getItemProgress(item.id).count] as const).filter(
      ([, count]) => count > 0,
    ),
  )
}

/**
 * The counts as a hook, for a screen that shows them live. `revision` is passed
 * only so the compiler, which memoises on arguments, reads again on a change.
 */
export function useWidgetCounts(): Partial<Record<string, number>> {
  return countsAt(useProgressRevision())
}

function countsAt(_revision: number): Partial<Record<string, number>> {
  return widgetCounts()
}

/** What every widget entry reads besides the plan and the place, from the app's stores. */
export type WidgetSettings = Omit<WidgetInput, 'signals' | 'placeLabel' | 'counts'>

export function useWidgetSettings(): WidgetSettings {
  const strings = useStrings()
  const locale = useLocale()
  const hijriOffset = useHijriOffset()
  const qada = useQada()
  const fastsOwed = useFastsOutstanding()
  const accent = useAccent()
  const pinned = usePinnedItems()
  const myDuas = { pinned, own: useOwnDuas().map(({ id, title }) => ({ id, title })) }
  const reader = useReaderPreferences()
  return {
    strings,
    locale,
    rtl: isRightToLeft(locale),
    reading: { arabicFirst: reader.arabicFirst, align: reader.align },
    hijriOffset,
    qada,
    fastsOwed,
    accent,
    myDuas,
  }
}

/** Never throws: a widget tap that cannot be read now is read on the next launch. */
function take(): void {
  void takeWidgetTaps().catch(() => {})
}

/**
 * Republishes the widgets' day whenever something they show could have
 * changed: the moment's item, a mark, what is owed, the language, the accent. Not every
 * minute — the timeline already carries the day forward on its own.
 */
export function useWidgetTimeline(
  signals: Signals | null,
  planned: Plan | null,
  placeLabel: string | null,
): void {
  const settings = useWidgetSettings()
  const { locale, hijriOffset, qada, fastsOwed, accent, myDuas } = settings
  const tapsThrough = useWidgetTapsThrough()

  // Widget taps (done, prayed, +1) wait where the widget keeps them until the app runs:
  // taken in on launch, on every return to the foreground, and on a press
  // heard while the app is open. Each one moves the cursor, which republishes.
  useEffect(() => {
    take()
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') take()
    })
    const unsubscribe = onWidgetTap(take)
    return (): void => {
      foreground.remove()
      unsubscribe()
    }
  }, [])

  const key = JSON.stringify([
    planned?.today.rightNow?.itemId ?? null,
    planned?.today.window ?? null,
    signals ? Object.keys(signals.prayedToday) : null,
    signals ? Object.keys(signals.completedToday) : null,
    tapsThrough,
    signals?.userState.trackingPaused ?? null,
    qada,
    fastsOwed,
    locale,
    placeLabel,
    hijriOffset,
    accent,
    myDuas,
    settings.reading.arabicFirst,
    settings.reading.align,
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` fingerprints every input the timeline reads, so the widgets refresh only when one of them changes.
  useEffect(() => {
    if (!signals) return
    // A widget that cannot be updated is no reason to break Today.
    try {
      const timeline = widgetTimeline({
        ...settings,
        signals,
        placeLabel,
        counts: widgetCounts(),
      })
      void publishTimeline(timeline).catch(() => {})
    } catch {
      // Building the timeline threw; the widgets keep their last one.
    }
  }, [key])
}
