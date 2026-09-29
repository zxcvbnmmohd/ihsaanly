import { describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import type { NotificationContent } from '@ihsaanly/state/notifications/content'

import { type ReminderApi, syncReminders } from '../src/alarms'

function fakeChrome(pending: string[]): {
  api: ReminderApi
  alarms: Map<string, number>
  stored: Map<string, unknown>
} {
  const alarms = new Map(pending.map((name) => [name, 0]))
  const stored = new Map<string, unknown>()
  const api = {
    alarms: {
      getAll: async () => [...alarms.keys()].map((name) => ({ name, scheduledTime: 0 })),
      create: async (name: string, info: { when?: number }) => {
        alarms.set(name, info.when ?? 0)
      },
      clear: async (name: string) => alarms.delete(name),
    },
    storage: {
      local: {
        set: async (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) stored.set(key, value)
        },
        remove: async (keys: string | string[]) => {
          for (const key of [keys].flat()) stored.delete(key)
        },
      },
    },
  } as unknown as ReminderApi
  return { api, alarms, stored }
}

const now = Date.parse('2026-09-28T12:00:00Z')

function content(identifier: string, at: number): NotificationContent {
  return {
    identifier,
    title: 'Evening adhkar',
    body: 'Open until Maghrib',
    at: new Date(at),
    channelId: 'reminders',
    data: { v: 1, kind: 'item', itemId: 'evening-adhkar', endsAt: at, reason: 'current-window' },
  }
}

describe('syncReminders', () => {
  it('arms future plan entries, clears stale ones, keeps others, and is idempotent', async () => {
    const { api, alarms, stored } = fakeChrome(['plan:stale@1', 'test:1'])
    const wanted = [content('plan:a@2', now + 60_000), content('plan:past@0', now - 60_000)]

    await syncReminders(wanted, en, api, now)
    expect([...alarms.keys()].sort()).toEqual(['plan:a@2', 'test:1'])
    expect(alarms.get('plan:a@2')).toBe(now + 60_000)
    expect(stored.get('plan:a@2')).toEqual({
      title: 'Evening adhkar',
      body: 'Open until Maghrib',
      itemId: 'evening-adhkar',
      endsAt: now + 60_000,
      actions: { done: 'Done', later: 'Later' },
    })

    await syncReminders(wanted, en, api, now)
    expect([...alarms.keys()].sort()).toEqual(['plan:a@2', 'test:1'])
  })
})
