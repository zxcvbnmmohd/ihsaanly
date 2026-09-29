import { describe, expect, it } from 'bun:test'

import { isQuiet } from './quiet-hours'

const TORONTO = 'America/Toronto'
const at = (iso: string): Date => new Date(iso)

describe('quiet hours', () => {
  const overnight = { from: 22, to: 7 }

  it('is never quiet when unset', () => {
    expect(isQuiet(at('2026-09-17T04:00:00Z'), TORONTO, null)).toBe(false)
  })

  it('covers the late evening', () => {
    expect(isQuiet(at('2026-09-18T03:00:00Z'), TORONTO, overnight)).toBe(true)
  })

  it('covers the small hours on the other side of midnight', () => {
    expect(isQuiet(at('2026-09-18T09:00:00Z'), TORONTO, overnight)).toBe(true)
  })

  it('leaves the daytime alone', () => {
    expect(isQuiet(at('2026-09-17T18:00:00Z'), TORONTO, overnight)).toBe(false)
  })

  it('handles a period inside one day', () => {
    const afternoon = { from: 13, to: 15 }
    expect(isQuiet(at('2026-09-17T18:00:00Z'), TORONTO, afternoon)).toBe(true)
    expect(isQuiet(at('2026-09-17T20:00:00Z'), TORONTO, afternoon)).toBe(false)
  })

  it('treats an empty period as no quiet hours', () => {
    expect(isQuiet(at('2026-09-18T03:00:00Z'), TORONTO, { from: 7, to: 7 })).toBe(false)
  })
})
