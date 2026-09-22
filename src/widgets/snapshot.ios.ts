import { File } from 'expo-file-system'
import { widgetsDirectory } from 'expo-widgets'

import { itemById, resolveText } from '@/content'
import type { Plan } from '@/plan/signals'

import type { WidgetEntry, WidgetSnapshot } from './snapshot-types'

export type { WidgetEntry, WidgetSnapshot } from './snapshot-types'

const SNAPSHOT = 'today.json'

function entryFor(id: string): WidgetEntry | null {
  const item = itemById(id)
  if (!item) return null
  return { id: item.id, title: resolveText(item.title) ?? item.id }
}

/**
 * Widgets run in a separate process and can only read the shared container, so
 * they read this rather than opening the database.
 */
export function writeSnapshot(plan: Plan, quickDuaIds: string[]): Promise<void> {
  const snapshot: WidgetSnapshot = {
    writtenAt: Date.now(),
    rightNow: plan.today.rightNow ? entryFor(plan.today.rightNow.itemId) : null,
    quickDuas: quickDuaIds.flatMap((id) => entryFor(id) ?? []),
  }

  // Returned rather than dropped: `write` is a promise, and the caller's
  // try/catch never saw a rejection from it.
  return new File(widgetsDirectory, SNAPSHOT).write(JSON.stringify(snapshot))
}
