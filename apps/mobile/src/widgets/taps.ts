import type { WidgetTap } from './model'

/**
 * Where widget taps wait for the app. iOS keeps them in the widgets' own
 * timelines (`taps.ios.ts`), Android in a file of its own (`taps.android.ts`);
 * everywhere else there are none, and a missing native module never breaks
 * the import.
 */
export function readWidgetTaps(): Promise<WidgetTap[]> {
  return Promise.resolve([])
}

/** Calls `listener` when a widget button is pressed while the app runs. Returns the unsubscribe. */
export function onWidgetTap(_listener: () => void): () => void {
  return (): void => {}
}

/** Drops taps up to `through` once the app has filed them, where they are kept apart. */
export function forgetWidgetTaps(_through: number): Promise<void> {
  return Promise.resolve()
}
