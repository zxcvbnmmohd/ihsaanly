import { describe, expect, it } from 'bun:test'

import { eventsToAdd, parseExport, type ExportedEvent } from './bundle'

const event = (subject: string, at: number): ExportedEvent => ({
  kind: 'prayer-performed',
  subject,
  at,
  logDay: '2026-09-17',
  deltaSeconds: null,
})

describe('merging an import', () => {
  it('adds what is new', () => {
    expect(eventsToAdd([event('fajr', 1)], [event('dhuhr', 2)])).toHaveLength(1)
  })

  it('skips what is already there', () => {
    expect(eventsToAdd([event('fajr', 1)], [event('fajr', 1)])).toEqual([])
  })

  it('makes importing the same file twice a no-op', () => {
    const existing = [event('fajr', 1), event('dhuhr', 2)]
    expect(eventsToAdd(existing, existing)).toEqual([])
  })

  it('treats the same prayer at a different instant as new', () => {
    expect(eventsToAdd([event('fajr', 1)], [event('fajr', 2)])).toHaveLength(1)
  })
})

describe('reading an export', () => {
  it('rejects text that is not JSON', () => {
    expect(parseExport('not json')).toBeNull()
  })

  it('rejects JSON that is not one of ours', () => {
    expect(parseExport('{"format":"something-else"}')).toBeNull()
  })

  it('accepts a well-formed export', () => {
    const raw = JSON.stringify({
      format: 'ihsaanly-export',
      version: 1,
      exportedAt: '2026-09-17T00:00:00.000Z',
      preferences: { place: null },
      events: [event('fajr', 1)],
    })
    expect(parseExport(raw)?.events).toHaveLength(1)
  })
})
