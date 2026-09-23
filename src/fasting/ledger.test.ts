import { describe, expect, it } from 'bun:test'

import { parseExport } from '@/data/bundle'

import {
  FAST_MADE_UP,
  FAST_OWED,
  FAST_OWED_CLEARED,
  fastsOutstanding,
  isRamadanDay,
  readLedger,
  type FastEvent,
} from './ledger'

const owed = (logDay: string): FastEvent => ({ kind: FAST_OWED, logDay })
const cleared = (logDay: string): FastEvent => ({ kind: FAST_OWED_CLEARED, logDay })
const madeUp = (logDay: string): FastEvent => ({ kind: FAST_MADE_UP, logDay })

describe('reading the owed-fasts ledger', () => {
  it('counts each recorded day once', () => {
    expect(readLedger([owed('2026-03-01'), owed('2026-03-01'), owed('2026-03-02')])).toEqual({
      owedDays: ['2026-03-01', '2026-03-02'],
      madeUp: 0,
    })
  })

  it('lets an undo take back that day only', () => {
    const ledger = readLedger([owed('2026-03-01'), owed('2026-03-02'), cleared('2026-03-01')])
    expect(ledger.owedDays).toEqual(['2026-03-02'])
  })

  it('lets a later record supersede an undo', () => {
    const ledger = readLedger([owed('2026-03-01'), cleared('2026-03-01'), owed('2026-03-01')])
    expect(ledger.owedDays).toEqual(['2026-03-01'])
  })

  it('counts every make-up', () => {
    expect(readLedger([madeUp('2026-04-01'), madeUp('2026-04-01')]).madeUp).toBe(2)
  })
})

describe('what is still owed', () => {
  it('is recorded less made up plus the backlog', () => {
    const ledger = readLedger([owed('2026-03-01'), owed('2026-03-02'), madeUp('2026-04-01')])
    expect(fastsOutstanding(ledger, 3)).toBe(4)
  })

  it('pays down a backlog with make-ups', () => {
    expect(fastsOutstanding(readLedger([madeUp('2026-04-01')]), 2)).toBe(1)
  })

  it('never goes below zero', () => {
    expect(fastsOutstanding(readLedger([madeUp('2026-04-01'), madeUp('2026-04-02')]), 0)).toBe(0)
  })

  it('is zero with nothing recorded', () => {
    expect(fastsOutstanding(readLedger([]), 0)).toBe(0)
  })
})

describe('whether a day is in Ramadan', () => {
  it('is true for a day inside Ramadan 1447', () => {
    expect(isRamadanDay({ year: 2026, month: 3, day: 1 }, 0)).toBe(true)
  })

  it('is false outside it', () => {
    expect(isRamadanDay({ year: 2026, month: 9, day: 23 }, 0)).toBe(false)
  })

  it('follows the moon-sighting offset at the edge of the month', () => {
    const lastOfShaban = { year: 2026, month: 2, day: 17 }
    expect(isRamadanDay(lastOfShaban, 0)).toBe(false)
    expect(isRamadanDay(lastOfShaban, 1)).toBe(true)
  })
})

describe('export and import', () => {
  it('carries the fasting events through a round trip', () => {
    const events = [FAST_OWED, FAST_OWED_CLEARED, FAST_MADE_UP].map((kind, index) => ({
      kind,
      subject: 'fast',
      at: index,
      logDay: '2026-03-01',
      deltaSeconds: null,
    }))
    const raw = JSON.stringify({
      format: 'ihsaanly-export',
      version: 1,
      exportedAt: '2026-09-23T00:00:00.000Z',
      preferences: { fastBacklog: 3 },
      events,
    })

    const parsed = parseExport(raw)
    expect(parsed?.events).toEqual(events)
    expect(parsed?.preferences.fastBacklog).toBe(3)
  })
})
