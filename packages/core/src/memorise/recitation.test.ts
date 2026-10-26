import { describe, expect, it } from 'bun:test'
import { playAgain, REPEATS, SPEEDS } from './recitation'

describe('recitation controls', () => {
  it('offers the speeds and repeat counts a learner needs', () => {
    expect(SPEEDS).toEqual([0.5, 0.75, 1])
    expect(REPEATS).toEqual([1, 2, 3, 5, 10, 'always'])
  })

  it('plays again until the chosen count is reached', () => {
    expect(playAgain(1, 1)).toBe(false)
    expect(playAgain(3, 1)).toBe(true)
    expect(playAgain(3, 2)).toBe(true)
    expect(playAgain(3, 3)).toBe(false)
  })

  it('always plays again when repeating without end', () => {
    expect(playAgain('always', 100)).toBe(true)
  })
})
