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

/**
 * Hears every `reloadPreferences`, for readers that are not a single-key
 * store (item progress reads a key per item).
 */
export function onPreferencesReload(listener: () => void): () => void {
  const entry = { reload: listener }
  stores.add(entry)
  return (): void => {
    stores.delete(entry)
  }
}

/**
 * `fallback` may be a function, read each time the stored value is missing:
 * for a default that depends on content installed after this module loads.
 * Stored values are JSON, so a function is never a value itself.
 */
export function createPreferenceStore<T>(
  key: string,
  schema: ZodType<T>,
  fallback: T | (() => T),
): PreferenceStore<T> {
  const fallbackValue = (): T =>
    typeof fallback === 'function' ? (fallback as () => T)() : fallback
  let current: T | undefined
  let loaded = false
  const listeners = new Set<() => void>()

  const get = (): T => {
    if (!loaded) {
      current = readPreference(key, schema) ?? fallbackValue()
      loaded = true
    }
    return current as T
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
