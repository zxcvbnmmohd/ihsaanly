import { addUserInteractionListener } from 'expo-widgets'

import RightNowWidget from './ios/right-now-widget'
import type { WidgetTap } from './model'

/**
 * Every tap kept in the Right now widget's timeline. A press merges the new
 * list into the pressed entry and every later one (the expo-widgets patch), so
 * the same tap is read from many entries; `pendingTaps` dedupes them.
 */
export async function readWidgetTaps(): Promise<WidgetTap[]> {
  const entries = await RightNowWidget.getTimeline()
  return entries.flatMap((entry) => {
    const taps: unknown = (entry.props as { taps?: unknown }).taps
    return Array.isArray(taps) ? (taps as WidgetTap[]) : []
  })
}

/**
 * The press event is posted in the process that ran the intent. When that is
 * the widget extension the app never hears it, which is why the app also
 * reads the timeline on launch and on returning to the foreground.
 */
export function onWidgetTap(listener: () => void): () => void {
  const subscription = addUserInteractionListener(() => listener())
  return (): void => subscription.remove()
}
