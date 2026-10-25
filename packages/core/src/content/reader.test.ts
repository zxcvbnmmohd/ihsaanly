import { describe, expect, it } from 'bun:test'
import { isReadable, itemOpenPath } from './reader'

describe('isReadable', () => {
  it('is true for an item with Arabic or with parts, false for neither', () => {
    expect(isReadable({ arabic: 'سبحان الله', parts: undefined })).toBe(true)
    expect(isReadable({ arabic: null, parts: [] })).toBe(false)
    expect(isReadable({ arabic: null, parts: undefined })).toBe(false)
  })
})

describe('itemOpenPath', () => {
  it('opens a dua, a dhikr and a list of adhkar in the reader', () => {
    expect(itemOpenPath('dua-leaving-home')).toBe('/item/read/dua-leaving-home')
    expect(itemOpenPath('tasbih-after-prayer')).toBe('/item/read/tasbih-after-prayer')
    expect(itemOpenPath('morning-adhkar')).toBe('/item/read/morning-adhkar')
  })

  it('opens anything else, or an unknown id, on the item screen', () => {
    expect(itemOpenPath('fast-monday')).toBe('/item/fast-monday')
    expect(itemOpenPath('no-such-item')).toBe('/item/no-such-item')
  })
})
