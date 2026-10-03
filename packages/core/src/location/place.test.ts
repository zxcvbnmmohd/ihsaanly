import { describe, expect, it } from 'bun:test'

import { Place } from './place'

const valid = {
  label: 'Toronto',
  latitude: 43.7,
  longitude: -79.42,
  timeZone: 'America/Toronto',
  source: 'city',
}

describe('Place', () => {
  it('accepts a city or a device place', () => {
    expect(Place.safeParse(valid).success).toBe(true)
    expect(Place.safeParse({ ...valid, source: 'device' }).success).toBe(true)
  })

  it('accepts the coordinate extremes and rejects anything beyond', () => {
    expect(Place.safeParse({ ...valid, latitude: 90, longitude: 180 }).success).toBe(true)
    expect(Place.safeParse({ ...valid, latitude: -90, longitude: -180 }).success).toBe(true)
    expect(Place.safeParse({ ...valid, latitude: 90.01 }).success).toBe(false)
    expect(Place.safeParse({ ...valid, longitude: -180.01 }).success).toBe(false)
  })

  it('rejects an empty label or time zone and an unknown source', () => {
    expect(Place.safeParse({ ...valid, label: '' }).success).toBe(false)
    expect(Place.safeParse({ ...valid, timeZone: '' }).success).toBe(false)
    expect(Place.safeParse({ ...valid, source: 'gps' }).success).toBe(false)
  })
})
