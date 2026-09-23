import type { Widget } from 'expo-widgets'

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
import type { WidgetModel } from './model'

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
 * widget failing never stops the others, and nothing throws synchronously.
 */
export function publishTimeline(timeline: WidgetModel[]): Promise<void> {
  // The executor runs synchronously and any throw inside it becomes a rejection.
  return new Promise<void>((resolve, reject) => {
    const entries = timeline.map((entry) => ({ date: new Date(entry.at), props: entry }))
    const failures: unknown[] = []
    for (const widget of WIDGETS) {
      try {
        widget.updateTimeline(entries)
      } catch (error) {
        failures.push(error)
      }
    }
    if (failures.length > 0) {
      reject(new Error(`${failures.length} of ${WIDGETS.length} widgets did not take the timeline`))
      return
    }
    resolve()
  })
}
