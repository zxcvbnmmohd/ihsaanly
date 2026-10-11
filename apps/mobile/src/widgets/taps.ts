import type { WidgetTap } from './model'

/**
 * Where the Right now widget's done taps wait for the app. Only iOS has an
 * interactive widget (`taps.ios.ts`); everywhere else there are none, and a
 * missing native module never breaks the import.
 */
export function readWidgetTaps(): Promise<WidgetTap[]> {
  return Promise.resolve([])
}

/** Calls `listener` when a widget button is pressed while the app runs. Returns the unsubscribe. */
export function onWidgetTap(_listener: () => void): () => void {
  return (): void => {}
}
