import { dropTaps, onTapRecorded, readTaps } from './android/tap-store'
import type { WidgetTap } from './model'

/** Every tap the Android widget task has recorded and the app has not yet filed. */
export function readWidgetTaps(): Promise<WidgetTap[]> {
  return Promise.resolve(readTaps())
}

/**
 * The widget task runs in the app's own JS runtime, so a tap made while the
 * app is open is heard at once; one made while it is closed is read on launch.
 */
export function onWidgetTap(listener: () => void): () => void {
  return onTapRecorded(listener)
}

/** Filed taps leave the file, so the widget stops counting them on top of the app's progress. */
export function forgetWidgetTaps(through: number): Promise<void> {
  dropTaps(through)
  return Promise.resolve()
}
