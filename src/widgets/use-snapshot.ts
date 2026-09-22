import { useEffect } from 'react'

import { items } from '@/content'
import type { Plan } from '@/plan/signals'

import { writeSnapshot } from './snapshot'

/** The events a phone cannot detect, which is what the quick widget is for. */
const UNDETECTABLE = ['ascending', 'descending', 'leaving-home', 'travel']

const QUICK_DUA_IDS = items
  .filter((item) => item.trigger.kind === 'event' && UNDETECTABLE.includes(item.trigger.event))
  .map((item) => item.id)

export function useWidgetSnapshot(plan: Plan | null): void {
  const rightNow = plan?.today.rightNow?.itemId ?? null

  useEffect(() => {
    if (!plan) return

    try {
      writeSnapshot(plan, QUICK_DUA_IDS)
    } catch {
      // The shared container needs an app group, which needs a paid Apple
      // Developer membership. Until then this simply does nothing.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightNow])
}
