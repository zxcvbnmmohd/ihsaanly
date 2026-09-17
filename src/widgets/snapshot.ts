import { File } from 'expo-file-system'
import { widgetsDirectory } from 'expo-widgets'

import { itemById, resolveText } from '@/content'
import type { Plan } from '@/plan/signals'

const SNAPSHOT = 'today.json'

export interface WidgetEntry {
  id: string
  title: string
}

export interface WidgetSnapshot {
  writtenAt: number
  rightNow: WidgetEntry | null
  quickDuas: WidgetEntry[]
}

function entryFor(id: string): WidgetEntry | null {
  const item = itemById(id)
  if (!item) return null
  return { id: item.id, title: resolveText(item.title) ?? item.id }
}

/**
 * Widgets run in a separate process and can only read the shared container, so
 * they read this rather than opening the database. A small document the widget
 * can parse beats linking SQLite into an extension to render one card.
 */
export function writeSnapshot(plan: Plan, quickDuaIds: string[]): void {
  const snapshot: WidgetSnapshot = {
    writtenAt: Date.now(),
    rightNow: plan.today.rightNow ? entryFor(plan.today.rightNow.itemId) : null,
    quickDuas: quickDuaIds.flatMap((id) => entryFor(id) ?? []),
  }

  new File(widgetsDirectory, SNAPSHOT).write(JSON.stringify(snapshot))
}
