import { z } from 'zod'
import { COACH_MARKS_KEY } from '../cloud/keys'
import { createPreferenceStore } from '../storage/preference-store'
import { resetTourSeen } from '../today/hints'

/**
 * The first-use coach tours beyond Today's own (which lives in `todayHints`):
 * the focused reader, and the widget gallery once that screen exists. A new
 * surface adds its name here, reads `useCoachTourSeen`, and calls
 * `markCoachTourSeen` when its tour ends.
 */
export type CoachTour = 'reader' | 'widgetGallery'

const CoachMarks = z.object({ seen: z.array(z.string()) })

const store = createPreferenceStore(COACH_MARKS_KEY, CoachMarks, { seen: [] })

/** Whether this tour has been seen on this device (skipped counts). */
export function useCoachTourSeen(tour: CoachTour): boolean {
  return store.use().seen.includes(tour)
}

export function markCoachTourSeen(tour: CoachTour): void {
  const { seen } = store.get()
  if (seen.includes(tour)) return
  store.set({ seen: [...seen, tour] })
}

/** More → Show me around: every tour, Today's included, plays again. */
export function resetCoachTours(): void {
  store.set({ seen: [] })
  resetTourSeen()
}
