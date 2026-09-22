import { describe, expect, it } from 'bun:test'

import type { NotificationContent } from './content'
import { planSync } from './sync-plan'

const NOW = new Date('2026-09-21T12:00:00.000Z').getTime()

function entry(identifier: string, minutesAway: number): NotificationContent {
  return {
    identifier,
    title: 'Morning adhkar',
    body: 'Open until Dhuhr.',
    at: new Date(NOW + minutesAway * 60_000),
    channelId: 'reminders',
    data: { v: 1, kind: 'item', itemId: 'morning-adhkar', endsAt: NOW, reason: 'current-window' },
  }
}

describe('planSync', () => {
  it('adds what is wanted and not already pending', () => {
    const plan = planSync([entry('plan:a@1', 30)], [], NOW)

    expect(plan.add.map((content) => content.identifier)).toEqual(['plan:a@1'])
    expect(plan.cancel).toEqual([])
  })

  it('leaves an entry that is already pending alone, so running twice changes nothing', () => {
    const plan = planSync([entry('plan:a@1', 30)], ['plan:a@1'], NOW)

    expect(plan.add).toEqual([])
    expect(plan.cancel).toEqual([])
  })

  it('cancels a plan entry that is no longer wanted', () => {
    const plan = planSync([entry('plan:a@1', 30)], ['plan:a@1', 'plan:b@2'], NOW)

    expect(plan.cancel).toEqual(['plan:b@2'])
  })

  it('never touches a snooze or a test, which the plan does not own', () => {
    const plan = planSync([], ['later:a@1', 'test:1', 'plan:b@2'], NOW)

    expect(plan.cancel).toEqual(['plan:b@2'])
  })

  it('ignores anything already in the past rather than scheduling it', () => {
    const plan = planSync([entry('plan:gone@1', -30), entry('plan:soon@2', 30)], [], NOW)

    expect(plan.add.map((content) => content.identifier)).toEqual(['plan:soon@2'])
  })

  it('cancels a pending entry whose time has passed out of the plan', () => {
    const plan = planSync([entry('plan:gone@1', -30)], ['plan:gone@1'], NOW)

    expect(plan.cancel).toEqual(['plan:gone@1'])
  })
})
