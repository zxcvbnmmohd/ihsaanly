import { addUserInteractionListener, type Widget } from 'expo-widgets'

import DuaOfTheDayWidget from './ios/dua-of-the-day-widget'
import PrayersWidget from './ios/prayers-widget'
import QuickDuasWidget from './ios/quick-duas-widget'
import RightNowWidget from './ios/right-now-widget'
import UpNextWidget from './ios/up-next-widget'
import type { WidgetModel, WidgetTap } from './model'

/** The widgets with buttons. A press is merged into the pressed widget's own timeline only. */
const INTERACTIVE: Widget<WidgetModel>[] = [
  RightNowWidget,
  PrayersWidget,
  UpNextWidget,
  QuickDuasWidget,
  DuaOfTheDayWidget,
]

/**
 * Every tap kept in an interactive widget's timeline. A press merges the new
 * list into the pressed entry and every later one (the expo-widgets patch),
 * and a republish carries waiting taps into every widget, so the same tap is
 * read many times over; `pendingTaps` dedupes them. One widget that cannot be
 * read never hides another's taps.
 */
export async function readWidgetTaps(): Promise<WidgetTap[]> {
  const timelines = await Promise.all(
    INTERACTIVE.map((widget) => widget.getTimeline().catch(() => [])),
  )
  return timelines.flat().flatMap((entry) => {
    const taps: unknown = (entry.props as { taps?: unknown }).taps
    return Array.isArray(taps) ? (taps as WidgetTap[]) : []
  })
}

/**
 * The press event is posted in the process that ran the intent. When that is
 * the widget extension the app never hears it, which is why the app also
 * reads the timelines on launch and on returning to the foreground.
 */
export function onWidgetTap(listener: () => void): () => void {
  const subscription = addUserInteractionListener(() => listener())
  return (): void => subscription.remove()
}

/** Nothing to drop: the next republish carries only what is still waiting. */
export function forgetWidgetTaps(_through: number): Promise<void> {
  return Promise.resolve()
}
