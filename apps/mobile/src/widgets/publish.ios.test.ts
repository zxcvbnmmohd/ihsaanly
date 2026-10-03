import { beforeEach, describe, expect, it, mock } from 'bun:test'

import type { WidgetModel } from './model'

const NAMES = [
  'right-now',
  'next-prayer',
  'prayers',
  'hijri-date',
  'up-next',
  'also-today',
  'quick-duas',
  'dua-of-the-day',
  'make-up',
  'coming-up',
] as const

const received: Record<string, unknown[][]> = {}
const failing = new Set<string>()

for (const name of NAMES) {
  mock.module(`./ios/${name}-widget`, () => ({
    default: {
      updateTimeline: (entries: unknown[]) => {
        if (failing.has(name)) throw new Error(`${name} failed`)
        const list = received[name] ?? []
        list.push(entries)
        received[name] = list
      },
    },
  }))
}

const { publishTimeline } = await import('./publish.ios')

const entry = (at: number): WidgetModel =>
  ({
    at,
    stale: false,
    next: null,
    rightNow: null,
    labels: { app: 'Ihsaanly' },
  }) as unknown as WidgetModel

beforeEach(() => {
  failing.clear()
  for (const name of NAMES) received[name] = []
})

describe('publishTimeline (iOS)', () => {
  it('gives every widget the same entries, dated and without nulls', async () => {
    await publishTimeline([entry(1_000), entry(2_000)])
    for (const name of NAMES) {
      const [entries] = received[name] ?? []
      expect(entries).toEqual([
        { date: new Date(1_000), props: { at: 1_000, stale: false, labels: { app: 'Ihsaanly' } } },
        { date: new Date(2_000), props: { at: 2_000, stale: false, labels: { app: 'Ihsaanly' } } },
      ])
    }
  })

  it('still updates the others when one widget fails, then rejects with the count', async () => {
    failing.add('prayers')
    failing.add('make-up')
    await expect(publishTimeline([entry(1_000)])).rejects.toThrow(
      '2 of 10 widgets did not take the timeline',
    )
    expect(received['right-now']).toHaveLength(1)
    expect(received['coming-up']).toHaveLength(1)
    expect(received.prayers).toHaveLength(0)
  })
})
