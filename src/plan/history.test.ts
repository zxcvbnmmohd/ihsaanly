import { describe, expect, it } from 'bun:test'

import { daysActive, summarise, withoutRetracted, type LoggedAction } from './history'

const action = (
  subject: string,
  logDay: string,
  deltaSeconds: number | null = null,
): LoggedAction => ({ kind: 'prayer-performed', subject, at: 0, logDay, deltaSeconds })

describe('summarising what was done', () => {
  it('counts by subject, most frequent first', () => {
    const summary = summarise(
      [action('fajr', 'a'), action('dhuhr', 'a'), action('fajr', 'b')],
      'prayer-performed',
    )

    expect(summary[0]).toMatchObject({ subject: 'fajr', count: 2 })
    expect(summary[1]).toMatchObject({ subject: 'dhuhr', count: 1 })
  })

  it('ignores other kinds of event', () => {
    const mixed: LoggedAction[] = [
      action('fajr', 'a'),
      { kind: 'prayer-missed', subject: 'asr', at: 0, logDay: 'a', deltaSeconds: null },
    ]
    expect(summarise(mixed, 'prayer-performed')).toHaveLength(1)
  })

  it('reports a typical offset when one can be computed', () => {
    const summary = summarise(
      [action('fajr', 'a', -600), action('fajr', 'b', -200), action('fajr', 'c', -400)],
      'prayer-performed',
    )
    expect(summary[0]?.typicalOffsetSeconds).toBe(-400)
  })

  it('reports no offset when none was recorded', () => {
    expect(summarise([action('fajr', 'a')], 'prayer-performed')[0]?.typicalOffsetSeconds).toBeNull()
  })

  it('counts distinct days rather than actions', () => {
    expect(daysActive([action('fajr', 'a'), action('dhuhr', 'a'), action('fajr', 'b')])).toBe(2)
  })

  it('handles an empty log', () => {
    expect(summarise([], 'prayer-performed')).toEqual([])
    expect(daysActive([])).toBe(0)
  })
})

const pairs: [string, string][] = [
  ['prayer-performed', 'prayer-unmarked'],
  ['item-completed', 'item-uncompleted'],
]

const event = (kind: string, subject: string, at: number, logDay = 'a'): LoggedAction => ({
  kind,
  subject,
  at,
  logDay,
  deltaSeconds: null,
})

describe('retracted actions', () => {
  it('drops a mark and the unmark that undid it', () => {
    const actions = [
      event('prayer-performed', 'fajr', 1),
      event('prayer-unmarked', 'fajr', 2),
      event('prayer-performed', 'dhuhr', 3),
    ]
    expect(withoutRetracted(actions, pairs).map((entry) => entry.subject)).toEqual(['dhuhr'])
  })

  it('keeps a mark made again after an undo', () => {
    const actions = [
      event('item-completed', 'tasbih', 1),
      event('item-uncompleted', 'tasbih', 2),
      event('item-completed', 'tasbih', 3),
    ]
    expect(withoutRetracted(actions, pairs)).toEqual([event('item-completed', 'tasbih', 3)])
  })

  it('never retracts across days', () => {
    const actions = [
      event('item-completed', 'tasbih', 1, 'a'),
      event('item-uncompleted', 'tasbih', 2, 'b'),
    ]
    expect(withoutRetracted(actions, pairs)).toHaveLength(1)
  })
})
