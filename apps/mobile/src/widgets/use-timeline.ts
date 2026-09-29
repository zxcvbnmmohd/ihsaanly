import { isRightToLeft } from '@ihsaanly/core/i18n/locale'
import type { Plan, Signals } from '@ihsaanly/core/plan/signals'
import { useFastsOutstanding } from '@ihsaanly/state/fasting/store'
import { useHijriOffset } from '@ihsaanly/state/hijri/store'
import { useLocale } from '@ihsaanly/state/i18n/store'
import { useQada } from '@ihsaanly/state/prayer/marks'
import { useStrings } from '@ihsaanly/state/strings'
import { useEffect } from 'react'

import { widgetTimeline } from './model'
import { publishTimeline } from './publish'

/**
 * Republishes the widgets' day whenever something they show could have
 * changed: the moment's item, a mark, what is owed, the language. Not every
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

  const key = JSON.stringify([
    planned?.today.rightNow?.itemId ?? null,
    planned?.today.window ?? null,
    signals ? Object.keys(signals.prayedToday) : null,
    signals?.userState.trackingPaused ?? null,
    qada,
    fastsOwed,
    locale,
    placeLabel,
    hijriOffset,
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
      })
      void publishTimeline(timeline).catch(() => {})
    } catch {
      // Building the timeline threw; the widgets keep their last one.
    }
  }, [key])
}
