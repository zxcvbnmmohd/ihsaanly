import { itemById } from './index'
import { isOwnDuaId } from './my-duas'
import type { Item } from './schema'

/**
 * An item the focused reader can show: one with words to say, either its own
 * Arabic or a list of parts. Fasting, prayers and the like have none, so a
 * reminder or widget for them still opens the full item screen.
 */
export function isReadable(item: Pick<Item, 'arabic' | 'parts'>): boolean {
  return item.arabic !== null || (item.parts ?? []).length > 0
}

/**
 * Where a reminder or widget tap for an item lands: the focused reader for
 * something to read, the item screen otherwise (an unknown id included, which
 * then says it was not found). The user's own dua always opens its own page,
 * where it can be edited, whether or not a moment has installed it as an item.
 */
export function itemOpenPath(itemId: string): string {
  if (isOwnDuaId(itemId)) return `/item/${itemId}`
  const item = itemById(itemId)
  return item && isReadable(item) ? `/item/read/${itemId}` : `/item/${itemId}`
}
