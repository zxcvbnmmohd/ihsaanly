import { beforeEach, describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const backend = await import('./backend')
const { createPreferenceStore, onPreferencesReload, reloadPreferences } = await import(
  './preference-store'
)
const { onLocalWrite } = await import('./local-writes')

describe('a preference store', () => {
  beforeEach(resetStorage)

  it('tells a reload listener until it unsubscribes', () => {
    let heard = 0
    const stop = onPreferencesReload(() => {
      heard += 1
    })
    reloadPreferences()
    stop()
    reloadPreferences()
    expect(heard).toBe(1)
  })

  it('answers the fallback until something is stored', () => {
    const store = createPreferenceStore('pref-a', z.string(), 'dflt')
    expect(store.get()).toBe('dflt')
  })

  it('loads the stored value once and then serves it from memory', () => {
    backend.writePreferenceRow('pref-b', '"stored"')
    const store = createPreferenceStore('pref-b', z.string(), 'dflt')
    expect(store.get()).toBe('stored')

    backend.writePreferenceRow('pref-b', '"changed underneath"')
    expect(store.get()).toBe('stored')
  })

  it('writes through, remembers the value and tells listeners', () => {
    const store = createPreferenceStore('pref-c', z.string(), 'dflt')
    const heard: (string | null)[] = []
    const stop = onLocalWrite((key) => heard.push(key))

    store.set('next')
    stop()

    expect(store.get()).toBe('next')
    expect(backend.readPreferenceRow('pref-c')).toEqual({ value: '"next"' })
    expect(heard).toEqual(['pref-c'])
  })

  it('rereads every store after a reload', () => {
    const store = createPreferenceStore('pref-d', z.string(), 'dflt')
    expect(store.get()).toBe('dflt')

    backend.writePreferenceRow('pref-d', '"from sync"')
    reloadPreferences()

    expect(store.get()).toBe('from sync')
  })

  it('re-renders mounted readers when the rows were rewritten underneath', () => {
    const store = createPreferenceStore('pref-e', z.string(), 'dflt')
    const { result } = renderHook(() => store.use())
    expect(result.current).toBe('dflt')

    backend.writePreferenceRow('pref-e', '"from sync"')
    act(() => reloadPreferences())

    expect(result.current).toBe('from sync')
  })

  it('stops telling a reader that has gone away', () => {
    const store = createPreferenceStore('pref-f', z.string(), 'dflt')
    const { result, unmount } = renderHook(() => store.use())
    unmount()

    store.set('later')

    expect(result.current).toBe('dflt')
  })
})
