import { describe, expect, it } from 'bun:test'

import { badgeFor } from '../src/badge'

const now = Date.parse('2026-09-28T12:00:00Z')
const prayers = [
  { name: 'Dhuhr', at: now - 60_000 },
  { name: 'Asr', at: now + 42 * 60_000 },
  { name: 'Maghrib', at: now + 200 * 60_000 },
]

describe('badgeFor', () => {
  it('counts down to the next prayer, in minutes then hours', () => {
    expect(badgeFor(prayers, now, 'en')?.text).toBe('42m')
    expect(badgeFor(prayers, now + 43 * 60_000, 'en')?.text).toBe('2h')
    expect(badgeFor(prayers, now, 'en')?.title).toStartWith('Asr · ')
  })

  it('shows nothing once the list runs out', () => {
    expect(badgeFor(prayers, now + 300 * 60_000, 'en')).toBeNull()
  })
})
