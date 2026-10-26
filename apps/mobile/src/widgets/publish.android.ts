import { requestWidgetUpdate } from 'react-native-android-widget'

import { representation } from './android/render'
import { entryAt, writeTimeline } from './android/timeline-store'
import { waitingTaps } from './drain'
import type { WidgetModel, WidgetTap } from './model'
import { WIDGET_NAMES } from './names'

/**
 * Persists the day for the headless widget task, then redraws every placed
 * widget now, with any tap the app has not filed yet still drawn as made. A
 * name with nothing on the home screen is a no-op in the library.
 */
export async function publishTimeline(timeline: WidgetModel[]): Promise<void> {
  await writeTimeline(timeline)
  const taps = await waitingTaps().catch((): WidgetTap[] => [])
  const entry = entryAt(timeline, Date.now())
  const model = taps.length > 0 ? { ...entry, taps } : entry
  await Promise.all(
    WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: (info) => representation(info, model) }),
    ),
  )
}
