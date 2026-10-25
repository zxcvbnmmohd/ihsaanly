import { ACCENTS, type AccentName, DEFAULT_ACCENT } from '@ihsaanly/ui/types'
import { z } from 'zod'
import { createPreferenceStore } from '../storage/preference-store'

/**
 * The chosen accent, independent of System / Light / Dark. It travels with the
 * account like the theme does (`accent` in cloud/keys.ts). A stored name this
 * build does not know, from a newer one, reads as the default.
 */
const store = createPreferenceStore<AccentName>('accent', z.enum(ACCENTS), DEFAULT_ACCENT)

export const getAccent = store.get
export const setAccent = store.set
export const useAccent = store.use
