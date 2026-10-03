import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { createMemoryFeedback } from '@ihsaanly/cloud/memory/feedback'
import { createMemorySyncRemote } from '@ihsaanly/cloud/memory/sync-remote'
import type { Account, AuthService, Cloud } from '@ihsaanly/cloud/ports'
import { withDom } from '../../test/dom'
import { resetStorage } from '../../test/storage'

const { act, renderHook } = await withDom()
const { en } = await import('@ihsaanly/core/strings/en')
const { setLocale } = await import('../i18n/store')
const { setPlace } = await import('../location/store')
const { setUserState } = await import('../plan/user-state-store')
const { setHijriOffset } = await import('../hijri/store')
const { setCalculationPreferences } = await import('../prayer/store')
const { setBacklog } = await import('../prayer/backlog-store')
const { DEFAULT_USER_STATE } = await import('@ihsaanly/core/plan/user-state')
const { DEFAULT_CALCULATION_PREFERENCES } = await import('@ihsaanly/core/prayer/calculation')
const session = await import('../cloud/session')
const { useMoreGroups } = await import('./rows')

type Groups = ReturnType<typeof useMoreGroups>
const rowAt = (groups: Groups, href: string): Groups[number]['rows'][number] | undefined =>
  groups.flatMap((group) => group.rows).find((row) => row.href === href)

/** An auth service that signs in as exactly the account it is handed. */
function authFor(account: Account): AuthService {
  let listener: (account: Account | null) => void = () => {}
  return {
    current: () => null,
    onChange: (next) => {
      listener = next
      next(null)
      return () => {}
    },
    signIn: async () => {
      listener(account)
      return account
    },
    link: async () => account,
    signOut: async () => listener(null),
    deleteAccount: async () => {},
  }
}

const base: Pick<Account, 'uid' | 'provider' | 'providers'> = {
  uid: 'u',
  provider: 'apple',
  providers: ['apple'],
}

describe('useMoreGroups', () => {
  let stop: () => void = () => {}

  beforeEach(() => {
    stop()
    resetStorage()
    setLocale('en-GB')
  })
  afterAll(() => stop())

  it("reads each row's current value from the stores", () => {
    setPlace({
      label: 'London',
      latitude: 51.5,
      longitude: -0.1,
      timeZone: 'Europe/London',
      source: 'city',
    })
    setHijriOffset(1)
    setCalculationPreferences({ ...DEFAULT_CALCULATION_PREFERENCES, asr: 'hanafi' })
    setUserState({ ...DEFAULT_USER_STATE, travelling: true, trackingPaused: true })
    setBacklog('fajr', 2)
    setBacklog('asr', 1)

    const { result } = renderHook(() => useMoreGroups('dark'))

    expect(rowAt(result.current, '/location')?.detail).toBe('London')
    expect(rowAt(result.current, '/calculation')?.detail).toBe(en.asr.hanafi)
    expect(rowAt(result.current, '/hijri')?.detail).toBe(en.hijri.offsetLabel(1))
    expect(rowAt(result.current, '/tracking')?.detail).toBe(
      `${en.tracking.travelling}, ${en.tracking.paused}`,
    )
    expect(rowAt(result.current, '/appearance')?.detail).toBe(en.appearance.dark)
    expect(rowAt(result.current, '/qada')?.detail).toBe(en.qada.summary(3))
    expect(rowAt(result.current, '/language')?.detail).toBe(en.language.names.en)
  })

  it('says so when nothing is set yet', () => {
    const { result } = renderHook(() => useMoreGroups('system'))

    expect(rowAt(result.current, '/location')?.detail).toBe(en.location.notSet)
    expect(rowAt(result.current, '/qada')?.detail).toBe(en.qada.none)
  })

  it('follows the stores as they change', () => {
    const { result } = renderHook(() => useMoreGroups('light'))

    act(() => setHijriOffset(-1))

    expect(rowAt(result.current, '/hijri')?.detail).toBe(en.hijri.offsetLabel(-1))
  })

  it('has no Account row in a build without a cloud', () => {
    const { result } = renderHook(() => useMoreGroups('light'))
    expect(rowAt(result.current, '/account')).toBeUndefined()
  })

  it('shows Not signed in in a build with a cloud', () => {
    const { result } = renderHook(() => useMoreGroups('light', true))
    expect(rowAt(result.current, '/account')?.detail).toBe(en.account.notSignedIn)
  })

  it.each([
    [
      'the email',
      { ...base, email: 'aisha@example.test', displayName: 'Aisha' },
      'aisha@example.test',
    ],
    ['the name when there is no email', { ...base, email: null, displayName: 'Aisha' }, 'Aisha'],
    [
      'the provider when there is neither',
      { ...base, email: null, displayName: null },
      en.account.signedInWith.apple,
    ],
  ])('shows %s for a signed-in account', async (_name, account, detail) => {
    const cloud: Cloud = {
      auth: authFor(account),
      remote: createMemorySyncRemote(),
      feedback: createMemoryFeedback(),
    }
    stop = session.startCloud(async () => cloud, { debounceMs: 5 })
    const { result } = renderHook(() => useMoreGroups('light', true))

    await act(async () => {
      await session.signIn('apple')
    })

    expect(rowAt(result.current, '/account')?.detail).toBe(detail)
  })
})
