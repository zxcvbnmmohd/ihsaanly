import { describe, expect, test } from 'bun:test'
import type { RemoteChanges, SyncEvent } from '../ports'
import { createMemorySyncRemote } from './sync-remote'

const event = (at: number): SyncEvent => ({
  kind: 'review',
  subject: 'item-1',
  at,
  logDay: '2026-01-01',
  deltaSeconds: null,
})

describe('memory watch', () => {
  test('hears each push to the account after its cursor, and the cursor advances', async () => {
    const remote = createMemorySyncRemote()
    await remote.push('u', { events: [event(1)], preferences: [] })
    const { cursor } = await remote.pull('u', null)

    const heard: RemoteChanges[] = []
    const stop = remote.watch('u', cursor, (changes) => heard.push(changes))
    // Nothing after the cursor yet: no initial delivery.
    expect(heard).toEqual([])

    await remote.push('u', { events: [event(2)], preferences: [] })
    await remote.push('other', { events: [event(3)], preferences: [] })
    await remote.push('u', {
      events: [],
      preferences: [{ key: 'theme', value: '"dark"', updatedAt: 4 }],
    })

    expect(heard).toEqual([
      { events: [event(2)], preferences: [], cursor: '2' },
      {
        events: [],
        preferences: [{ key: 'theme', value: '"dark"', updatedAt: 4 }],
        cursor: '3',
      },
    ])
    expect(remote.watchers()).toBe(1)

    stop()
    expect(remote.watchers()).toBe(0)
    await remote.push('u', { events: [event(5)], preferences: [] })
    expect(heard).toHaveLength(2)
  })

  test('delivers what is already past the cursor as soon as it attaches', async () => {
    const remote = createMemorySyncRemote()
    await remote.push('u', { events: [event(1)], preferences: [] })
    const heard: RemoteChanges[] = []
    remote.watch('u', null, (changes) => heard.push(changes))
    expect(heard).toEqual([{ events: [event(1)], preferences: [], cursor: '1' }])
  })

  test('a removed preference counts as a preferences change', async () => {
    const remote = createMemorySyncRemote()
    await remote.push('u', {
      events: [],
      preferences: [
        { key: 'a', value: '1', updatedAt: 1 },
        { key: 'b', value: '2', updatedAt: 1 },
      ],
    })
    const { cursor } = await remote.pull('u', null)
    await remote.push('u', { events: [], preferences: [], removedPreferences: ['a'] })
    expect(await remote.pull('u', cursor)).toEqual({
      events: [],
      preferences: [{ key: 'b', value: '2', updatedAt: 1 }],
      cursor: '2',
    })
  })
})
