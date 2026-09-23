import type { WidgetModel } from './model'

/**
 * The platform files (`publish.ios.ts`, `publish.android.ts`) hand the timeline
 * to their widgets. This one exists for every other platform, and so that a
 * missing native module never breaks the import.
 */
export function publishTimeline(_timeline: WidgetModel[]): Promise<void> {
  return Promise.resolve()
}
