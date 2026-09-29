// Pure "item → Item screen props" helpers, shared by the app's item route and
// the marketing site's demo engine.

import { resolveText } from '@ihsaanly/core/content'
import type { Item } from '@ihsaanly/core/content/schema'
import { type ShareCardText, sourceFor } from '@ihsaanly/core/content/share-text'
import type { Strings } from '@ihsaanly/core/strings/en'
import type { RemindState } from '../screens/item'

/**
 * Only window and calendar items are ever scheduled, so only they get a
 * reminder switch. Offering one for a dua on leaving home would be a lie.
 */
export function remindFor(
  item: Item,
  enabled: boolean,
  known: boolean,
  perItem: Partial<Record<string, boolean>>,
  defaults: { windows: boolean; lookAhead: boolean },
  strings: Strings,
): RemindState | null {
  if (!enabled || known) return null
  if (item.trigger.kind === 'window') {
    return { value: perItem[item.id] ?? defaults.windows, detail: strings.item.remindWindow }
  }
  if (item.trigger.kind === 'day') {
    return { value: perItem[item.id] ?? defaults.lookAhead, detail: strings.item.remindLookAhead }
  }
  return null
}

export function cardFor(item: Item, strings: Strings): ShareCardText {
  const [first] = item.evidence
  return {
    title: resolveText(item.title) ?? item.id,
    arabic: item.arabic,
    transliteration: resolveText(item.transliteration),
    translation: resolveText(item.translation),
    source: first ? sourceFor(first, strings) : null,
  }
}
