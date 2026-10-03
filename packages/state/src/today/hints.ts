import { z } from 'zod'
import { TODAY_HINTS_KEY } from '../cloud/keys'
import { createPreferenceStore } from '../storage/preference-store'

export const TodayHints = z.object({
  tourSeen: z.boolean(),
  prayersMarked: z.number().int().nonnegative(),
})

export type TodayHints = z.infer<typeof TodayHints>

/** "Tap a prayer when you've prayed it" shows until this many prayers are marked here. */
export const PRAYER_HINT_MARKS = 3

const store = createPreferenceStore(TODAY_HINTS_KEY, TodayHints, {
  tourSeen: false,
  prayersMarked: 0,
})

export const useTodayHints = store.use
export const getTodayHints = store.get

export function setTourSeen(): void {
  store.set({ ...store.get(), tourSeen: true })
}

/** One more prayer marked; counting stops once the hint has stopped. */
export function notePrayerMarked(): void {
  const current = store.get()
  if (current.prayersMarked >= PRAYER_HINT_MARKS) return
  store.set({ ...current, prayersMarked: current.prayersMarked + 1 })
}
