import { describe, expect, it } from 'bun:test'
import { itemById } from '@ihsaanly/core/content'
import { passes } from './library'

const item = itemById('evening-adhkar')
if (!item) throw new Error('fixture item missing from content')

describe('passes', () => {
  it('passes everything for the "all" filter', () => {
    expect(passes(item, 'all', [], [])).toBe(true)
  })

  it('filters "on today" to the enabled ids', () => {
    expect(passes(item, 'onToday', [item.id], [])).toBe(true)
    expect(passes(item, 'onToday', [], [])).toBe(false)
  })

  it('filters "known" to the known ids', () => {
    expect(passes(item, 'known', [], [item.id])).toBe(true)
    expect(passes(item, 'known', [], [])).toBe(false)
  })
})
