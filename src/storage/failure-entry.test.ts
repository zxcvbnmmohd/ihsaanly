import { describe, expect, it } from 'bun:test'

import { appended, CAPACITY, entryFor, STACK_LIMIT } from './failure-entry'

const at = new Date('2026-09-22T18:40:00.000Z')

describe('the failure log', () => {
  it('keeps the newest entries and drops the oldest', () => {
    let log = [entryFor('step-0', new Error('first'), at)]
    for (let index = 1; index < CAPACITY + 10; index += 1) {
      log = appended(log, entryFor(`step-${index}`, new Error(`failure ${index}`), at))
    }

    expect(log).toHaveLength(CAPACITY)
    expect(log[0]?.label).toBe('step-10')
    expect(log.at(-1)?.label).toBe(`step-${CAPACITY + 9}`)
  })

  it('records what was thrown even when it is not an Error', () => {
    const entry = entryFor('rollover', 'a string was thrown', at)

    expect(entry.message).toBe('a string was thrown')
    expect(entry.stack).toBeNull()
    expect(entry.at).toBe('2026-09-22T18:40:00.000Z')
  })

  it('truncates a stack rather than carrying the whole thing', () => {
    const error = new Error('deep')
    error.stack = 'x'.repeat(2000)

    expect(entryFor('deep', error, at).stack).toHaveLength(STACK_LIMIT)
  })
})
