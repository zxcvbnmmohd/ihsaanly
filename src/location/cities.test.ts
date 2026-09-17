import { describe, expect, it } from 'bun:test'

import { searchCities } from './cities'

describe('city search', () => {
  it('ignores queries shorter than two characters', () => {
    expect(searchCities('')).toEqual([])
    expect(searchCities('t')).toEqual([])
    expect(searchCities('  ')).toEqual([])
  })

  it('matches on a name prefix, case insensitively', () => {
    const labels = searchCities('toron').map((place) => place.label)
    expect(labels.some((label) => label.startsWith('Toronto'))).toBe(true)
  })

  it('ranks more populous cities first', () => {
    const [first] = searchCities('london')
    expect(first?.label).toContain('United Kingdom')
  })

  it('returns coordinates and a timezone usable for prayer times', () => {
    const [toronto] = searchCities('toronto')

    expect(toronto?.latitude).toBeCloseTo(43.7, 0)
    expect(toronto?.longitude).toBeCloseTo(-79.4, 0)
    expect(toronto?.timezone).toBe('America/Toronto')
    expect(toronto?.source).toBe('city')
  })

  it('respects the result limit', () => {
    expect(searchCities('san', 3).length).toBeLessThanOrEqual(3)
  })
})
