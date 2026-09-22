import { describe, expect, it } from 'bun:test'

import { items } from './index'
import { groupByCategory, searchItems } from './search'

describe('library search', () => {
  it('returns everything for an empty query', () => {
    expect(searchItems(items, '  ')).toHaveLength(items.length)
  })

  it('matches on a title', () => {
    const found = searchItems(items, 'leaving')
    expect(found.map((item) => item.id)).toContain('dua-leaving-home')
  })

  it('matches on a situation rather than a name', () => {
    expect(searchItems(items, 'travel').length).toBeGreaterThan(0)
  })

  it('matches on a transliteration', () => {
    expect(searchItems(items, 'bismill').length).toBeGreaterThan(0)
  })

  it('requires every term to match', () => {
    expect(searchItems(items, 'leaving fasting')).toEqual([])
  })

  it('returns nothing for a term that appears nowhere', () => {
    expect(searchItems(items, 'zzzznotathing')).toEqual([])
  })
})

describe('grouping', () => {
  it('covers every item exactly once', () => {
    const grouped = groupByCategory(items)
    expect(grouped.flatMap((section) => section.items)).toHaveLength(items.length)
  })

  it('orders categories predictably', () => {
    const categories = groupByCategory(items).map((section) => section.category)
    expect(categories).toEqual([...categories].sort())
  })
})
