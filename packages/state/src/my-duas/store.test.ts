import { beforeEach, describe, expect, it } from 'bun:test'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const store = await import('./store')
const { itemById } = await import('@ihsaanly/core/content')
const { MAX_OWN_DUAS, MAX_PINNED } = await import('@ihsaanly/core/content/my-duas')
const { writePreference } = await import('../storage/preferences')
const { reloadPreferences } = await import('../storage/preference-store')

type OwnDua = import('@ihsaanly/core/content/my-duas').OwnDua

const dua = (id: string, moment: OwnDua['moment'] = null): OwnDua => ({
  id,
  title: `Dua ${id}`,
  arabic: null,
  transliteration: null,
  text: 'Words',
  repeat: 1,
  moment,
})

describe('pinned items', () => {
  beforeEach(resetStorage)

  it('pins and unpins, in the order pinned', () => {
    const { result } = renderHook(() => store.usePinnedItems())
    expect(result.current).toEqual([])
    act(() => store.togglePinned('a'))
    act(() => store.togglePinned('b'))
    expect(result.current).toEqual(['a', 'b'])
    act(() => store.togglePinned('a'))
    expect(store.getPinnedItems()).toEqual(['b'])
  })

  it('takes no more pins once full, but still unpins', () => {
    writePreference(
      'pinnedItems',
      Array.from({ length: MAX_PINNED }, (_, index) => `item-${index}`),
    )
    reloadPreferences()
    store.togglePinned('one-more')
    expect(store.getPinnedItems()).not.toContain('one-more')
    store.togglePinned('item-0')
    expect(store.getPinnedItems()).toHaveLength(MAX_PINNED - 1)
  })
})

describe('own duas', () => {
  beforeEach(resetStorage)

  it('adds, edits in place and deletes', () => {
    const { result } = renderHook(() => store.useOwnDuas())
    expect(result.current).toEqual([])

    act(() => {
      expect(store.saveOwnDua(dua('mine-a'))).toBe(true)
      expect(store.saveOwnDua(dua('mine-b'))).toBe(true)
    })
    expect(result.current.map((entry) => entry.id)).toEqual(['mine-a', 'mine-b'])

    act(() => {
      store.saveOwnDua({ ...dua('mine-a'), title: 'Edited' })
    })
    expect(store.ownDuaById(result.current, 'mine-a')?.title).toBe('Edited')
    expect(store.ownDuaById(result.current, 'mine-x')).toBeNull()

    act(() => store.deleteOwnDua('mine-a'))
    expect(store.getOwnDuas().map((entry) => entry.id)).toEqual(['mine-b'])
  })

  it('refuses a new dua past the cap, and still saves an edit', () => {
    writePreference(
      'ownDuas',
      Array.from({ length: MAX_OWN_DUAS }, (_, index) => dua(`mine-${index}`)),
    )
    reloadPreferences()
    expect(store.saveOwnDua(dua('mine-new'))).toBe(false)
    expect(store.saveOwnDua({ ...dua('mine-0'), title: 'Still' })).toBe(true)
    expect(store.getOwnDuas()[0]?.title).toBe('Still')
  })

  it('makes a dua with a moment findable as an item, and forgets it once deleted', () => {
    store.saveOwnDua(dua('mine-evening', 'evening'))
    store.saveOwnDua(dua('mine-plain'))
    expect(itemById('mine-evening')?.trigger).toEqual({ kind: 'window', window: 'evening' })
    expect(itemById('mine-plain')).toBeUndefined()

    store.deleteOwnDua('mine-evening')
    expect(itemById('mine-evening')).toBeUndefined()
  })

  it('installs what a sync wrote, on the next read', () => {
    store.getOwnDuas()
    writePreference('ownDuas', [dua('mine-synced', 'night')])
    reloadPreferences()
    expect(itemById('mine-synced')).toBeUndefined()
    store.getOwnDuas()
    expect(itemById('mine-synced')).toBeDefined()
  })
})
