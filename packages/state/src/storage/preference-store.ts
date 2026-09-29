import { useSyncExternalStore } from 'react'
import type { ZodType } from 'zod'

import { readPreference, writePreference } from './preferences'

export interface PreferenceStore<T> {
  get: () => T
  set: (value: T) => void
  use: () => T
}

interface Reloadable {
  reload: () => void
}

/** Every store made, so a sync that rewrote rows underneath them can refresh them all. */
const stores = new Set<Reloadable>()

/**
 * Drops every cached value and tells each store's readers, which then read the
 * rows again. For writes that bypassed `set` — a sync applying another
 * device's settings.
 */
export function reloadPreferences(): void {
  stores.forEach((store) => store.reload())
}

export function createPreferenceStore<T>(
  key: string,
  schema: ZodType<T>,
  fallback: T,
): PreferenceStore<T> {
  let current = fallback
  let loaded = false
  const listeners = new Set<() => void>()

  const get = (): T => {
    if (!loaded) {
      current = readPreference(key, schema) ?? fallback
      loaded = true
    }
    return current
  }

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener)
    return (): void => {
      listeners.delete(listener)
    }
  }

  stores.add({
    reload: (): void => {
      loaded = false
      listeners.forEach((listener) => listener())
    },
  })

  return {
    get,
    set: (value: T): void => {
      writePreference(key, value)
      current = value
      loaded = true
      listeners.forEach((listener) => listener())
    },
    use: () => useSyncExternalStore(subscribe, get),
  }
}
