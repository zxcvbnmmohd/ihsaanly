import { cityOf } from '@ihsaanly/core/location/place'
import { usePlace } from '@ihsaanly/state/location/store'
import { useSignals } from '@ihsaanly/state/plan/use-plan'

import { currentWidgetModel, type WidgetModel, widgetInk } from './model'
import sample from './sample.json'
import { useWidgetCounts, useWidgetSettings } from './use-timeline'

/** What the widgets show before there is a place to plan from: the gallery sample. */
const SAMPLE: WidgetModel = sample

/**
 * The entry the widgets show now, built from the same stores and the same
 * `currentWidgetModel` as the published timeline, so a preview in the widget
 * gallery says what the widget itself says, in the chosen accent. Without a
 * place nothing can be planned, and the sample stands in.
 */
export function useWidgetPreview(): WidgetModel {
  const settings = useWidgetSettings()
  const counts = useWidgetCounts()
  const signals = useSignals()
  const place = usePlace()
  if (!signals) return { ...SAMPLE, ink: widgetInk(settings.accent) }
  return currentWidgetModel({
    ...settings,
    signals,
    placeLabel: place ? cityOf(place.label) : null,
    counts,
  })
}
