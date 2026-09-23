'use no memo'

import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import { assertNever } from '@/assert-never'

import { representation } from './render'
import { entryAt, readTimeline } from './timeline-store'

/**
 * Runs headless whenever the launcher asks: a widget added, resized, or its
 * 30-minute update period elapsed. Each time it reads the last published
 * timeline and draws the entry that applies now, so the day moves on under
 * the widget without the app being opened. Taps are OPEN_URI deep links
 * handled natively, so WIDGET_CLICK never needs an answer here.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const model = entryAt(await readTimeline(), Date.now())
      props.renderWidget(representation(props.widgetInfo, model))
      return
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
      return
    default:
      return assertNever(props.widgetAction)
  }
}
