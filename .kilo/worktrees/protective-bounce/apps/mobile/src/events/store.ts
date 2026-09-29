import { z } from 'zod'

import { createPreferenceStore } from '@/storage/preference-store'

export const HomeRegion = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().min(1),
})

export type HomeRegion = z.infer<typeof HomeRegion>

export const EventSettings = z.object({
  /** Off unless asked for. Background location is a serious request. */
  detectHome: z.boolean(),
  home: HomeRegion.nullable(),
  /** Manually raised states, for the moments no sensor can find. */
  manual: z.array(z.string()),
})

export type EventSettings = z.infer<typeof EventSettings>

export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  detectHome: false,
  home: null,
  manual: [],
}

const store = createPreferenceStore('events', EventSettings, DEFAULT_EVENT_SETTINGS)

export const setEventSettings = store.set
export const useEventSettings = store.use
export const getEventSettings = store.get
