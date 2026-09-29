import { File, Paths } from 'expo-file-system'

import type { WidgetModel } from '../model'
import sample from '../sample.json'

/**
 * The timeline lives in a JSON file in the app's private files directory.
 * The widget task runs headless in the app's own process and JS runtime, so it
 * can read it with the same module; a file needs no schema, no migration and
 * no open database handle shared with the running app.
 */
function timelineFile(): File {
  return new File(Paths.document, 'widget-timeline.json')
}

export const SAMPLE_ENTRY: WidgetModel = sample

export async function writeTimeline(timeline: WidgetModel[]): Promise<void> {
  await timelineFile().write(JSON.stringify(timeline))
}

function isTimeline(value: unknown): value is WidgetModel[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        'at' in entry &&
        typeof entry.at === 'number' &&
        'ink' in entry &&
        'labels' in entry,
    )
  )
}

/** Null when nothing has been published yet or the file cannot be read. */
export async function readTimeline(): Promise<WidgetModel[] | null> {
  try {
    const file = timelineFile()
    if (!file.exists) return null
    const parsed: unknown = JSON.parse(await file.text())
    return isTimeline(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * The last entry that has begun. Past the end that is the stale entry, which
 * asks for the app; before the first (a clock set back) it is the first; with
 * nothing published it is the sample.
 */
export function entryAt(timeline: WidgetModel[] | null, now: number): WidgetModel {
  if (!timeline || timeline.length === 0) return SAMPLE_ENTRY
  const begun = timeline.filter((entry) => entry.at <= now)
  return begun.at(-1) ?? timeline[0] ?? SAMPLE_ENTRY
}
