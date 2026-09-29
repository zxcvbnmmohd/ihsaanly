import { z } from 'zod'

import { createPreferenceStore } from '@/storage/preference-store'

const store = createPreferenceStore('knownItems', z.array(z.string()), [])

export const setKnownItems = store.set
export const useKnownItems = store.use
export const getKnownItems = store.get

export function toggleKnown(id: string): void {
  const known = getKnownItems()
  setKnownItems(known.includes(id) ? known.filter((entry) => entry !== id) : [...known, id])
}
