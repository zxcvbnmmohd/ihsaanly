// Pure "Library screen" filtering, shared by the app's library route and the
// marketing site's demo engine.

import type { Item } from '@ihsaanly/core/content/schema'
import type { LibraryFilter } from '../screens/library'

export function passes(
  item: Item,
  filter: LibraryFilter,
  enabled: string[],
  known: string[],
): boolean {
  if (filter === 'onToday') return enabled.includes(item.id)
  if (filter === 'known') return known.includes(item.id)
  return true
}
