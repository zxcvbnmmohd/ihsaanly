import { z } from 'zod'

import { createPreferenceStore } from '@/storage/preference-store'

import type { Prayer } from './qada'

/**
 * Prayers owed from before the app started tracking, as a count per prayer.
 * A count and never a list of dates: the point is to catch up, not to keep an
 * archive of what was missed.
 */
const Backlog = z.record(z.string(), z.number().int().min(0))

const store = createPreferenceStore<Partial<Record<Prayer, number>>>('qadaBacklog', Backlog, {})

export const useQadaBacklog = store.use
export const getQadaBacklog = store.get

export function setBacklog(prayer: Prayer, count: number): void {
  store.set({ ...store.get(), [prayer]: Math.max(0, count) })
}
