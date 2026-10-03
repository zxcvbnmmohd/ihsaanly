import { describe, expect, it } from 'bun:test'

import { MOON_SIGHTING_AUTHORITIES } from './moon-sighting'

describe('moon sighting authorities', () => {
  it('lists regions alphabetically, as the note promises, not as a ranking', () => {
    const regions = MOON_SIGHTING_AUTHORITIES.map((entry) => entry.region)
    expect(regions).toEqual([...regions].sort((a, b) => a.localeCompare(b)))
  })

  it('names at least one body per region, with no duplicates or links', () => {
    const bodies = MOON_SIGHTING_AUTHORITIES.flatMap((entry) => {
      expect(entry.bodies.length).toBeGreaterThan(0)
      return entry.bodies
    })
    expect(new Set(bodies).size).toBe(bodies.length)
    bodies.forEach((body) => {
      expect(body.trim()).toBe(body)
      expect(body).not.toMatch(/https?:/)
    })
  })
})
