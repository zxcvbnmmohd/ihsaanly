import type { Plan } from '@/plan/signals'

export type { WidgetEntry, WidgetSnapshot } from './snapshot-types'

/**
 * Default implementation for every platform but iOS. `expo-widgets` is
 * iOS-only and throws at import time elsewhere, so the real one lives in
 * `snapshot.ios.ts` and Metro picks it per platform. A runtime check would
 * come too late — the import itself is what fails.
 */
export function writeSnapshot(_plan: Plan, _quickDuaIds: string[]): Promise<void> {
  // No widgets on this platform.
  return Promise.resolve()
}
