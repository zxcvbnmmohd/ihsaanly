import { items } from '@ihsaanly/core/content'
import { z } from 'zod'
import { createPreferenceStore } from '../storage/preference-store'

/**
 * What a new user starts with. A function, not a constant: the content can be
 * replaced at startup (`installContent`), after this module has loaded.
 */
export function defaultEnabled(): string[] {
  return items.filter((item) => item.defaultOn).map((item) => item.id)
}

const store = createPreferenceStore('enabledItems', z.array(z.string()), defaultEnabled)

export const setEnabledItems = store.set
export const useEnabledItems = store.use
export const getEnabledItems = store.get

export function toggleEnabled(id: string): void {
  const enabled = getEnabledItems()
  setEnabledItems(enabled.includes(id) ? enabled.filter((entry) => entry !== id) : [...enabled, id])
}
