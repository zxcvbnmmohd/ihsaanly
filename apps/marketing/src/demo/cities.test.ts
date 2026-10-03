import { describe, expect, test } from 'bun:test'
import { defaultCityFor } from './cities'

const AT = new Date(Date.UTC(2026, 0, 15, 12, 0))

describe('defaultCityFor', () => {
  test('a time zone with a built-in city gets that city', () => {
    const city = defaultCityFor('Asia/Riyadh', AT)
    expect(city.timeZone).toBe('Asia/Riyadh')
    expect(city.label).toBe('Makkah, Saudi Arabia')
    expect(city.source).toBe('city')
  })

  test('another zone gets a city whose clock reads the same', () => {
    // Asia/Aden is not listed but shares Riyadh's offset all year.
    const city = defaultCityFor('Asia/Aden', AT)
    expect(city.timeZone).toBe('Asia/Riyadh')
  })

  test('a zone no city shares falls back to Makkah', () => {
    // Pacific/Chatham (+13:45 in January) matches no listed city.
    expect(defaultCityFor('Pacific/Chatham', AT).label).toBe('Makkah, Saudi Arabia')
  })

  test('reads the clock when no instant is given', () => {
    expect(defaultCityFor('Europe/London').label).toBeTruthy()
  })

  test('the offset is read for the given instant (daylight saving)', () => {
    const summer = new Date(Date.UTC(2026, 6, 15, 12, 0))
    // Brussels is not listed: in winter it is +1, in summer +2, so it matches different cities.
    const winter = defaultCityFor('Europe/Brussels', AT).timeZone
    const matched = defaultCityFor('Europe/Brussels', summer).timeZone
    expect(matched).not.toBe(winter)
  })
})
