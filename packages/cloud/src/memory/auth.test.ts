import { describe, expect, test } from 'bun:test'
import { LinkConflictError, LinkRequiredError, ReauthUnavailableError } from '../ports'
import { createMemoryAuth } from './auth'
import { createMemorySyncRemote } from './sync-remote'

const SAME = { apple: 'aisha@example.test', google: 'aisha@example.test' }

describe('one account per email', () => {
  test('Google on an Apple account asks to link, and signing in with Apple links it', async () => {
    const auth = createMemoryAuth({ emails: SAME })
    const apple = await auth.signIn('apple')
    await auth.signOut()

    const attempt = auth.signIn('google')
    await expect(attempt).rejects.toBeInstanceOf(LinkRequiredError)
    const error = await attempt.catch((caught: unknown) => caught)
    expect(error).toMatchObject({
      existing: 'apple',
      attempted: 'google',
      email: 'aisha@example.test',
    })
    expect(auth.current()).toBeNull()

    const linked = await auth.signIn('apple')
    expect(linked).toMatchObject({
      uid: apple.uid,
      provider: 'apple',
      providers: ['apple', 'google'],
    })

    await auth.signOut()
    expect(await auth.signIn('google')).toMatchObject({ uid: apple.uid })
  })

  test('signing out forgets a sign-in waiting to be linked', async () => {
    const auth = createMemoryAuth({ emails: SAME })
    await auth.signIn('apple')
    await auth.signOut()
    await auth.signIn('google').catch(() => undefined)
    await auth.signOut()

    expect((await auth.signIn('apple')).providers).toEqual(['apple'])
  })

  test('links another method by hand, even with a different (relay) email', async () => {
    const auth = createMemoryAuth({
      emails: { apple: 'x1y2@privaterelay.appleid.com', google: 'aisha@example.test' },
    })
    const apple = await auth.signIn('apple')

    const linked = await auth.link('google')
    expect(linked).toMatchObject({ uid: apple.uid, providers: ['apple', 'google'] })
    expect(auth.current()?.providers).toEqual(['apple', 'google'])

    await auth.signOut()
    expect((await auth.signIn('google')).uid).toBe(apple.uid)
  })

  test('refuses to link an identity that already opens another account', async () => {
    const auth = createMemoryAuth()
    const google = await auth.signIn('google')
    await auth.signOut()
    const apple = await auth.signIn('apple')
    expect(apple.uid).not.toBe(google.uid)

    await expect(auth.link('google')).rejects.toBeInstanceOf(LinkConflictError)
    expect(auth.current()).toMatchObject({ uid: apple.uid, providers: ['apple'] })
  })

  test('deletes an account with both methods linked, freeing both identities', async () => {
    const remote = createMemorySyncRemote()
    const auth = createMemoryAuth({ emails: SAME, available: ['google'] })
    const account = await auth.signIn('google')
    await auth.link('apple')
    await remote.push(account.uid, {
      events: [{ kind: 'k', subject: 's', at: 1, logDay: 'd', deltaSeconds: null }],
      preferences: [],
    })

    await auth.deleteAccount((uid) => remote.erase(uid))

    expect(auth.current()).toBeNull()
    expect((await remote.pull(account.uid, null)).events).toHaveLength(0)
    expect((await auth.signIn('apple')).providers).toEqual(['apple'])
  })

  test('cannot delete where none of the linked methods can sign in', async () => {
    const auth = createMemoryAuth({
      seed: [{ uid: 'apple-only', email: 'a@example.test', providers: ['apple'] }],
      emails: { apple: 'a@example.test' },
      available: ['google'],
    })
    await auth.signIn('apple')
    let erased = false

    const deleting = auth.deleteAccount(async () => {
      erased = true
    })
    await expect(deleting).rejects.toBeInstanceOf(ReauthUnavailableError)
    expect(erased).toBe(false)
    expect(auth.current()?.uid).toBe('apple-only')
  })

  test('link and deleteAccount need a signed-in user', async () => {
    const auth = createMemoryAuth()
    await expect(auth.link('google')).rejects.toThrow('Not signed in')
    await expect(auth.deleteAccount(async () => {})).rejects.toThrow('Not signed in')
  })

  test('onChange reports the current account at once, then changes until unsubscribed', async () => {
    const auth = createMemoryAuth()
    const seen: (string | null)[] = []
    const unsubscribe = auth.onChange((account) => seen.push(account?.uid ?? null))
    await auth.signIn('google')
    unsubscribe()
    await auth.signOut()
    expect(seen).toEqual([null, 'memory-google'])
  })
})
