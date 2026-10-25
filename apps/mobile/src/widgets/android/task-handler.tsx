'use no memo'

import { assertNever } from '@ihsaanly/core/assert-never'
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget'

import type { WidgetModel, WidgetTap } from '../model'
import { WIDGET_NAMES } from '../names'
import { representation } from './render'
import { readTaps, recordTap, tapFromClick } from './tap-store'
import { entryAt, readTimeline } from './timeline-store'

/** The entry that applies now, with the taps the app has not filed yet drawn on it. */
async function current(taps: WidgetTap[]): Promise<WidgetModel> {
  const model = entryAt(await readTimeline(), Date.now())
  return taps.length > 0 ? { ...model, taps } : model
}

/**
 * Runs headless whenever the launcher asks: a widget added, resized, or its
 * 30-minute update period elapsed. Each time it reads the last published
 * timeline and draws the entry that applies now, so the day moves on under
 * the widget without the app being opened. Row links are OPEN_URI deep links
 * handled natively; a mark (done, prayed, +1) is a click that arrives here,
 * is kept for the app (`tap-store.ts`) and is drawn at once, on the widget
 * pressed and on every other placed widget.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      props.renderWidget(representation(props.widgetInfo, await current(readTaps())))
      return
    }
    case 'WIDGET_CLICK': {
      const tap = tapFromClick(props.clickAction, props.clickActionData, Date.now())
      if (!tap) return
      const model = await current(recordTap(tap))
      props.renderWidget(representation(props.widgetInfo, model))
      const others = WIDGET_NAMES.filter((name) => name !== props.widgetInfo.widgetName)
      // Another widget that cannot be redrawn now catches up at its next update.
      await Promise.all(
        others.map((widgetName) =>
          requestWidgetUpdate({ widgetName, renderWidget: (info) => representation(info, model) }),
        ),
      ).catch(() => {})
      return
    }
    case 'WIDGET_DELETED':
      return
    default:
      return assertNever(props.widgetAction)
  }
}
