import { requestWidgetUpdate } from 'react-native-android-widget'

import { representation } from './android/render'
import { entryAt, writeTimeline } from './android/timeline-store'
import type { WidgetModel } from './model'
import { WIDGET_NAMES } from './names'

/**
 * Persists the day for the headless widget task, then redraws every placed
 * widget now. A name with nothing on the home screen is a no-op in the library.
 */
export async function publishTimeline(timeline: WidgetModel[]): Promise<void> {
  await writeTimeline(timeline)
  const model = entryAt(timeline, Date.now())
  await Promise.all(
    WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({ widgetName, renderWidget: (info) => representation(info, model) }),
    ),
  )
}
