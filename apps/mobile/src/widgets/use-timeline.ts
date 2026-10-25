import { isRightToLeft } from '@ihsaanly/core/i18n/locale'
import type { Plan, Signals } from '@ihsaanly/core/plan/signals'
import { useFastsOutstanding } from '@ihsaanly/state/fasting/store'
import { useHijriOffset } from '@ihsaanly/state/hijri/store'
import { useLocale } from '@ihsaanly/state/i18n/store'
import { useOwnDuas, usePinnedItems } from '@ihsaanly/state/my-duas/store'
import { useQada } from '@ihsaanly/state/prayer/marks'
import { useStrings } from '@ihsaanly/state/strings'
import { useAccent } from '@ihsaanly/state/theme/accent-store'
import { useEffect } from 'react'
import { AppState } from 'react-native'

import { takeWidgetTaps, useWidgetTapsThrough } from './drain'
import { widgetTimeline } from './model'
import { publishTimeline } from './publish'
import { onWidgetTap } from './taps'

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
  const strings = useStrings()
  const locale = useLocale()
  const hijriOffset = useHijriOffset()
  const qada = useQada()
  const fastsOwed = useFastsOutstanding()
  const tapsThrough = useWidgetTapsThrough()
  const accent = useAccent()
  const pinned = usePinnedItems()
  const myDuas = { pinned, own: useOwnDuas().map(({ id, title }) => ({ id, title })) }

  // Done taps on the Right now widget wait in its timeline until the app runs:
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
  ])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` fingerprints every input the timeline reads, so the widgets refresh only when one of them changes.
  useEffect(() => {
    if (!signals) return
    // A widget that cannot be updated is no reason to break Today.
    try {
      const timeline = widgetTimeline({
        signals,
        strings,
        locale,
        rtl: isRightToLeft(locale),
        placeLabel,
        hijriOffset,
        qada,
        fastsOwed,
        accent,
        myDuas,
      })
      void publishTimeline(timeline).catch(() => {})
    } catch {
      // Building the timeline threw; the widgets keep their last one.
    }
  }, [key])
}
