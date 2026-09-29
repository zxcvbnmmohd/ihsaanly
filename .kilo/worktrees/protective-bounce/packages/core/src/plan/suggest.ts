import { z } from 'zod'

import { isRelevantNow, RULING_RANK } from './plan'
import type { Signals } from './signals'

export const SuggestionState = z.object({
  shownAt: z.string().nullable(),
  itemId: z.string().nullable(),
  dismissed: z.array(z.string()),
})

export type SuggestionState = z.infer<typeof SuggestionState>

export const DEFAULT_SUGGESTION: SuggestionState = { shownAt: null, itemId: null, dismissed: [] }

/** One suggestion a week. Growth, not a feed. */
export const SUGGESTION_INTERVAL_MS = 7 * 86_400_000

/** The first three weeks after onboarding, when fasting is too large an ask. */
export type Phase = 'early' | 'settled'

/**
 * Picks the one item worth offering next: not enabled, not known, not
 * declined; relevant to this very moment first, so the offer lands with a
 * reason; fasting held back while the user is new; then what the content
 * itself recommends. Deterministic for a given input, and nothing at all once
 * everything is on.
 */
export function suggest(signals: Signals, state: SuggestionState, phase: Phase): string | null {
  const enabled = new Set(signals.preferences.enabledItemIds)
  const known = new Set(signals.preferences.knownItemIds)
  const dismissed = new Set(state.dismissed)

  const candidates = signals.items.filter(
    (item) => !enabled.has(item.id) && !known.has(item.id) && !dismissed.has(item.id),
  )

  const shownAt = state.shownAt ? new Date(state.shownAt).getTime() : null
  const withinInterval =
    shownAt !== null && signals.now.getTime() - shownAt < SUGGESTION_INTERVAL_MS
  if (withinInterval) {
    return candidates.some((item) => item.id === state.itemId) ? state.itemId : null
  }

  const score = (item: (typeof candidates)[number]): number[] => [
    isRelevantNow(item, signals) ? 0 : 1,
    phase === 'early' && item.category === 'fasting' ? 1 : 0,
    item.defaultOn ? 0 : 1,
    RULING_RANK[item.ruling],
  ]

  const [best] = [...candidates].sort((left, right) => {
    const a = score(left)
    const b = score(right)
    for (let index = 0; index < a.length; index += 1) {
      const delta = (a[index] ?? 0) - (b[index] ?? 0)
      if (delta !== 0) return delta
    }
    return left.id.localeCompare(right.id)
  })

  return best?.id ?? null
}
