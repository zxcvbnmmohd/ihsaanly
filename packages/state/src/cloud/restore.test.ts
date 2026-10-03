import { beforeEach, describe, expect, it } from 'bun:test'
import { createMemoryAuth } from '@ihsaanly/cloud/memory/auth'
import { createMemoryFeedback } from '@ihsaanly/cloud/memory/feedback'
import { createMemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'
import type { Account } from '@ihsaanly/cloud/ports'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { restoreOutcomeOf, useRestoreOutcome } = await import('./restore')
const { setOnboarding } = await import('../onboarding/store')
const session = await import('./session')

const account: Account = {
  uid: 'u',
  email: null,
  displayName: null,
  provider: 'apple',
  providers: ['apple'],
}
const onboarded = { completed: true, gender: 'female' } as const
const fresh = { completed: false, gender: 'unspecified' } as const

describe('restoreOutcomeOf', () => {
  const state = (
    over: Partial<Parameters<typeof restoreOutcomeOf>[0]>,
  ): Parameters<typeof restoreOutcomeOf>[0] => ({
    status: 'idle' as const,
    account,
    lastSyncedAt: 5,
    error: null,
    ...over,
  })

  it('is idle until an account exists, whatever the status says', () => {
    expect(restoreOutcomeOf(state({ account: null, status: 'syncing' }), onboarded)).toBe('idle')
  })

  it('is restoring while the first sync runs', () => {
    expect(restoreOutcomeOf(state({ status: 'syncing', lastSyncedAt: null }), fresh)).toBe(
      'restoring',
    )
  })

  it('is idle on an error or a conflict, which the Account screen handles', () => {
    expect(restoreOutcomeOf(state({ status: 'error' }), onboarded)).toBe('idle')
    expect(restoreOutcomeOf(state({ status: 'account-mismatch' }), onboarded)).toBe('idle')
  })

  it('is idle until a sync has completed', () => {
    expect(restoreOutcomeOf(state({ lastSyncedAt: null }), onboarded)).toBe('idle')
  })

  it('is restored when the account finished setup, needs-setup when it did not', () => {
    expect(restoreOutcomeOf(state({}), onboarded)).toBe('restored')
    expect(restoreOutcomeOf(state({}), fresh)).toBe('needs-setup')
  })
})

describe('useRestoreOutcome', () => {
  let stop: () => void = () => {}

  beforeEach(() => {
    stop()
    resetStorage()
  })

  it('follows the account and the onboarding preference together', async () => {
    const cloud = {
      auth: createMemoryAuth({ uid: 'me' }),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
    stop = session.startCloud(async () => cloud, { debounceMs: 5 })
    const { result } = renderHook(() => useRestoreOutcome())
    expect(result.current).toBe('idle')

    await act(async () => {
      await session.signIn('apple')
      await session.syncNow()
    })
    expect(result.current).toBe('needs-setup')

    act(() => setOnboarding(onboarded))
    expect(result.current).toBe('restored')
    act(() => stop())
  })
})
