import { items } from '@ihsaanly/core/content'
import { z } from 'zod'
import { createPreferenceStore } from '@/storage/preference-store'

const DEFAULT_ENABLED = items.filter((item) => item.defaultOn).map((item) => item.id)

const store = createPreferenceStore('enabledItems', z.array(z.string()), DEFAULT_ENABLED)

export const setEnabledItems = store.set
export const useEnabledItems = store.use
export const getEnabledItems = store.get
export { DEFAULT_ENABLED }

export function toggleEnabled(id: string): void {
  const enabled = getEnabledItems()
  setEnabledItems(enabled.includes(id) ? enabled.filter((entry) => entry !== id) : [...enabled, id])
}
