import { beforeEach, describe, expect, it } from 'bun:test'
import { sqlite } from '../../test/native'
import { resetStorage } from '../../test/storage'

const backend = await import('./backend')
const { appendFailure, forgetFailures, recentFailures } = await import('./log')

describe('the failure log', () => {
  beforeEach(resetStorage)

  it('keeps the newest failure last, with its message and label', () => {
    appendFailure('first', new Error('boom'))
    appendFailure('second', 'plain text')

    const [older, newer] = recentFailures().slice(-2)
    expect(older).toMatchObject({ label: 'first', message: 'boom' })
    expect(newer).toMatchObject({ label: 'second', message: 'plain text', stack: null })
  })

  it('persists the log so the next launch can read it', () => {
    appendFailure('persisted', new Error('kept'))

    const row = backend.readPreferenceRow('failureLog')
    expect(JSON.parse(row?.value ?? '[]').at(-1)).toMatchObject({ label: 'persisted' })
  })

  it('reads the persisted log again after the cache is dropped', () => {
    backend.writePreferenceRow(
      'failureLog',
      JSON.stringify([{ at: '2026-01-01T00:00:00.000Z', label: 'old', message: 'm', stack: null }]),
    )
    forgetFailures()

    expect(recentFailures()).toEqual([
      { at: '2026-01-01T00:00:00.000Z', label: 'old', message: 'm', stack: null },
    ])
  })

  it('starts empty when nothing is stored, and a wipe does not bring old failures back', () => {
    appendFailure('before the wipe', new Error('x'))

    backend.wipe()
    forgetFailures()

    expect(recentFailures()).toEqual([])
    appendFailure('after', 'y')
    expect(recentFailures().map((entry) => entry.label)).toEqual(['after'])
  })

  it('keeps the entry in memory when it cannot be written', () => {
    sqlite.db.exec('ALTER TABLE preferences RENAME TO preferences_hidden')
    try {
      expect(() => appendFailure('unwritable', new Error('disk'))).not.toThrow()
    } finally {
      sqlite.db.exec('ALTER TABLE preferences_hidden RENAME TO preferences')
    }

    expect(recentFailures().at(-1)).toMatchObject({ label: 'unwritable', message: 'disk' })
  })
})
