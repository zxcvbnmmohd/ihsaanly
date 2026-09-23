import { useEffect } from 'react'

import { useFastsOutstanding } from '@/fasting/store'
import { useHijriOffset } from '@/hijri/store'
import { isRightToLeft } from '@/i18n/locale'
import { useLocale } from '@/i18n/store'
import type { Plan, Signals } from '@/plan/signals'
import { useQada } from '@/prayer/marks'
import { useStrings } from '@/strings'

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
