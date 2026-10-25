import type { Widget } from 'expo-widgets'
import { waitingTaps } from './drain'
import AlsoTodayWidget from './ios/also-today-widget'
import ComingUpWidget from './ios/coming-up-widget'
import DuaOfTheDayWidget from './ios/dua-of-the-day-widget'
import HijriDateWidget from './ios/hijri-date-widget'
import MakeUpWidget from './ios/make-up-widget'
import NextPrayerWidget from './ios/next-prayer-widget'
import PrayersWidget from './ios/prayers-widget'
import QuickDuasWidget from './ios/quick-duas-widget'
import RightNowWidget from './ios/right-now-widget'
import UpNextWidget from './ios/up-next-widget'
import type { WidgetModel, WidgetTap } from './model'
import { withoutNulls } from './native-props'

const WIDGETS: Widget<WidgetModel>[] = [
  RightNowWidget,
  NextPrayerWidget,
  PrayersWidget,
  HijriDateWidget,
  UpNextWidget,
  AlsoTodayWidget,
  QuickDuasWidget,
  DuaOfTheDayWidget,
  MakeUpWidget,
  ComingUpWidget,
]

/**
 * Hands the same timeline to all ten iOS widgets. Each widget picks what it
 * shows from the one model, so they can never disagree about the moment. One
 * widget failing never stops the others.
 *
 * Done taps the app has not taken in yet live in the Right now widget's
 * current timeline, which this rewrites, so they are read first and carried
 * into every new entry: a tap is never dropped by a republish, and stays
 * shown as done until the app has filed it and the model says so itself.
 */
export async function publishTimeline(timeline: WidgetModel[]): Promise<void> {
  const taps = await waitingTaps().catch((): WidgetTap[] => [])
  const entries = timeline.map((entry) => ({
    date: new Date(entry.at),
    props: withoutNulls(taps.length > 0 ? { ...entry, taps } : entry),
  }))
  const failures: unknown[] = []
  for (const widget of WIDGETS) {
    try {
      widget.updateTimeline(entries)
    } catch (error) {
      failures.push(error)
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length} of ${WIDGETS.length} widgets did not take the timeline`)
  }
}
