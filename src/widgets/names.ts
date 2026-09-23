/**
 * One name per widget, shared by both platforms: the iOS `createWidget` name,
 * the `expo-widgets` plugin entry, and the Android widget provider.
 */
export const WIDGET_NAMES = [
  'RightNowWidget',
  'NextPrayerWidget',
  'PrayersWidget',
  'HijriDateWidget',
  'UpNextWidget',
  'AlsoTodayWidget',
  'QuickDuasWidget',
  'DuaOfTheDayWidget',
  'MakeUpWidget',
  'ComingUpWidget',
] as const

export type WidgetName = (typeof WIDGET_NAMES)[number]
