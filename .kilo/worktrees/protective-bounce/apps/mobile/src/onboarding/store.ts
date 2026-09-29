import { z } from 'zod'

import { createPreferenceStore } from '@/storage/preference-store'

/**
 * Asked once, and only so the tracking pause can be offered to those it
 * applies to. Stored on device like everything else, used for nothing else.
 */
export const Gender = z.enum(['female', 'male', 'unspecified'])
export type Gender = z.infer<typeof Gender>

export const Onboarding = z.object({
  completed: z.boolean(),
  gender: Gender,
  /** ISO instant onboarding finished. Optional so rows written before it existed still parse. */
  completedAt: z.string().optional(),
})

export type Onboarding = z.infer<typeof Onboarding>

export const DEFAULT_ONBOARDING: Onboarding = { completed: false, gender: 'unspecified' }

const store = createPreferenceStore('onboarding', Onboarding, DEFAULT_ONBOARDING)

export const setOnboarding = store.set
export const useOnboarding = store.use
export const getOnboarding = store.get
