import { beforeEach, describe, expect, test } from 'bun:test'
import type { Auth, AuthCredential, User, UserCredential } from 'firebase/auth'
import {
  LinkConflictError,
  LinkRequiredError,
  ReauthUnavailableError,
  type SignInProvider,
} from '../ports'
import { createFirebaseAuth, type SignInFlow, toAccount } from './auth'

let log: string[]

interface FakeUser {
  uid: string
  email: string | null
  displayName: string | null
  providerData: { providerId: string }[]
  delete: () => Promise<void>
}
const userWith = (...providerIds: string[]): FakeUser => ({
  uid: 'u1',
  email: 'aisha@example.test',
  displayName: 'Aisha',
  providerData: providerIds.map((providerId) => ({ providerId })),
  delete: async () => {
    log.push('delete')
  },
})
const APPLE = 'apple.com'
const GOOGLE = 'google.com'

interface FakeAuth {
  currentUser: FakeUser | null
  listeners: ((user: FakeUser | null) => void)[]
  signedOut: number
  onAuthStateChanged: (listener: (user: FakeUser | null) => void) => () => void
  signOut: () => Promise<void>
}
function authWith(user: FakeUser | null): FakeAuth {
  const auth: FakeAuth = {
    currentUser: user,
    listeners: [],
    signedOut: 0,
    onAuthStateChanged: (listener) => {
      auth.listeners.push(listener)
      return () => {
        auth.listeners = auth.listeners.filter((each) => each !== listener)
      }
    },
    signOut: async () => {
      auth.signedOut += 1
    },
  }
  return auth
}

const credential = { id: 'pending-credential' } as unknown as AuthCredential
const popupConflict = (extra: object = {}): object => ({
  code: 'auth/account-exists-with-different-credential',
  customData: { email: 'aisha@example.test' },
  ...extra,
})

interface FlowOptions {
  available?: SignInProvider[]
  pending?: AuthCredential | null
  revoke?: boolean
  signIn?: (provider: SignInProvider) => Promise<unknown>
  link?: (provider: SignInProvider) => Promise<unknown>
  linkCredential?: () => Promise<unknown>
  reauthenticate?: () => Promise<void>
}
function flowWith(options: FlowOptions = {}): SignInFlow {
  const { available = ['apple', 'google'], pending = credential } = options
  return {
    signIn: async (auth, provider) => {
      log.push(`signIn:${provider}`)
      const outcome = await (options.signIn?.(provider) ?? {
        user: (auth as unknown as FakeAuth).currentUser,
      })
      return outcome as UserCredential
    },
    link: async (_user, provider) => {
      log.push(`link:${provider}`)
      return (await options.link?.(provider)) as UserCredential
    },
    linkCredential: async (user, each) => {
      log.push(`linkCredential:${(each as unknown as { id: string }).id}:${user.uid}`)
      return (await options.linkCredential?.()) as UserCredential
    },
    pendingCredential: (_error, provider) => {
      log.push(`pendingCredential:${provider}`)
      return pending
    },
    available: async (provider) => {
      log.push(`available:${provider}`)
      return available.includes(provider)
    },
    reauthenticate: async (_user, provider) => {
      log.push(`reauthenticate:${provider}`)
      await options.reauthenticate?.()
    },
    ...(options.revoke
      ? {
          revoke: async (_auth: Auth, provider: SignInProvider) => {
            log.push(`revoke:${provider}`)
          },
        }
      : {}),
  }
}

function service(
  user: FakeUser | null,
  flow = flowWith(),
): ReturnType<typeof createFirebaseAuth> & {
  auth: FakeAuth
} {
  const auth = authWith(user)
  return Object.assign(createFirebaseAuth(auth as unknown as Auth, flow), { auth })
}
const asUser = (user: FakeUser): User => user as unknown as User

beforeEach(() => {
  log = []
})

describe('toAccount', () => {
  test('lists linked providers with Apple first whatever order Firebase gives', () => {
    expect(toAccount(asUser(userWith(GOOGLE, APPLE)))).toEqual({
      uid: 'u1',
      email: 'aisha@example.test',
      displayName: 'Aisha',
      provider: 'apple',
      providers: ['apple', 'google'],
    })
  })

  test('ignores providers we do not offer, and defaults the label to Google', () => {
    expect(toAccount(asUser(userWith('password')))).toMatchObject({
      provider: 'google',
      providers: [],
    })
    expect(toAccount(asUser(userWith(GOOGLE)))).toMatchObject({
      provider: 'google',
      providers: ['google'],
    })
  })
})

describe('current and onChange', () => {
  test('current is null signed out, the account signed in', () => {
    expect(service(null).current()).toBeNull()
    expect(service(userWith(GOOGLE)).current()).toMatchObject({ uid: 'u1', providers: ['google'] })
  })

  test('onChange maps Firebase users to accounts and unsubscribes', () => {
    const cloud = service(null)
    const seen: unknown[] = []
    const unsubscribe = cloud.onChange((account) => seen.push(account))
    cloud.auth.listeners[0]?.(userWith(APPLE))
    cloud.auth.listeners[0]?.(null)
    expect(seen).toEqual([expect.objectContaining({ provider: 'apple' }), null])
    unsubscribe()
    expect(cloud.auth.listeners).toEqual([])
  })
})

describe('signIn', () => {
  test('resolves with the account of the signed-in user', async () => {
    const user = userWith(GOOGLE)
    const cloud = service(null, flowWith({ signIn: async () => ({ user }) }))
    expect(await cloud.signIn('google')).toMatchObject({ uid: 'u1', providers: ['google'] })
  })

  test("prefers the auth instance's current user over the credential's", async () => {
    const cloud = service(
      userWith(APPLE, GOOGLE),
      flowWith({ signIn: async () => ({ user: userWith(GOOGLE) }) }),
    )
    expect((await cloud.signIn('google')).providers).toEqual(['apple', 'google'])
  })

  test('rethrows errors that are not an account clash, whatever their shape', async () => {
    for (const failure of [
      new Error('boom'),
      { code: 'auth/popup-closed-by-user' },
      'text',
      null,
    ]) {
      const cloud = service(null, flowWith({ signIn: async () => Promise.reject(failure) }))
      await expect(cloud.signIn('google')).rejects.toBe(failure)
    }
  })

  test('a clash becomes LinkRequiredError naming the other provider and the email', async () => {
    const cloud = service(null, flowWith({ signIn: () => Promise.reject(popupConflict()) }))
    const error = await cloud.signIn('google').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(LinkRequiredError)
    expect(error).toMatchObject({
      existing: 'apple',
      attempted: 'google',
      email: 'aisha@example.test',
    })
    const other = await service(null, flowWith({ signIn: () => Promise.reject(popupConflict()) }))
      .signIn('apple')
      .catch((caught: unknown) => caught)
    expect(other).toMatchObject({ existing: 'google', attempted: 'apple' })
  })

  test('the email is null when Firebase gives none or a non-string', async () => {
    for (const extra of [
      { customData: undefined },
      { customData: { email: 5 } },
      { customData: {} },
    ]) {
      const cloud = service(null, flowWith({ signIn: () => Promise.reject(popupConflict(extra)) }))
      expect(await cloud.signIn('google').catch((caught: unknown) => caught)).toMatchObject({
        email: null,
      })
    }
    const bare = service(
      null,
      flowWith({
        signIn: () => Promise.reject({ code: 'auth/account-exists-with-different-credential' }),
      }),
    )
    expect(await bare.signIn('google').catch((caught: unknown) => caught)).toMatchObject({
      email: null,
    })
  })

  test('the next sign-in with the existing provider links the one that clashed', async () => {
    let clash = true
    const apple = userWith(APPLE)
    const cloud = service(
      null,
      flowWith({
        signIn: async (provider) => {
          if (clash && provider === 'google') throw popupConflict()
          return { user: apple }
        },
      }),
    )
    await expect(cloud.signIn('google')).rejects.toBeInstanceOf(LinkRequiredError)
    clash = false
    await cloud.signIn('apple')
    expect(log).toEqual([
      'signIn:google',
      'pendingCredential:google',
      'signIn:apple',
      'linkCredential:pending-credential:u1',
    ])
    // Linked once: a later sign-in does not link again.
    log = []
    await cloud.signIn('apple')
    expect(log).toEqual(['signIn:apple'])
  })

  test('still signs in when linking fails', async () => {
    let clash = true
    const cloud = service(
      null,
      flowWith({
        signIn: async (provider) => {
          if (clash && provider === 'google') throw popupConflict()
          return { user: userWith(APPLE) }
        },
        linkCredential: () => Promise.reject({ code: 'auth/credential-already-in-use' }),
      }),
    )
    await cloud.signIn('google').catch(() => undefined)
    clash = false
    expect(await cloud.signIn('apple')).toMatchObject({ provider: 'apple' })
    expect(log).toContain('linkCredential:pending-credential:u1')
  })

  test('signing in again with the provider that clashed does not link it to itself', async () => {
    let clash = true
    const cloud = service(
      null,
      flowWith({
        signIn: async () => {
          if (clash) throw popupConflict()
          return { user: userWith(GOOGLE) }
        },
      }),
    )
    await cloud.signIn('google').catch(() => undefined)
    clash = false
    await cloud.signIn('google')
    expect(log.some((entry) => entry.startsWith('linkCredential'))).toBe(false)
  })

  test('with no credential to link, the clash is still reported and nothing is linked later', async () => {
    let clash = true
    const cloud = service(
      null,
      flowWith({
        pending: null,
        signIn: async (provider) => {
          if (clash && provider === 'google') throw popupConflict()
          return { user: userWith(APPLE) }
        },
      }),
    )
    await expect(cloud.signIn('google')).rejects.toBeInstanceOf(LinkRequiredError)
    clash = false
    await cloud.signIn('apple')
    expect(log.some((entry) => entry.startsWith('linkCredential'))).toBe(false)
  })

  test('signing out forgets the credential waiting to be linked', async () => {
    let clash = true
    const cloud = service(
      null,
      flowWith({
        signIn: async (provider) => {
          if (clash && provider === 'google') throw popupConflict()
          return { user: userWith(APPLE) }
        },
      }),
    )
    await cloud.signIn('google').catch(() => undefined)
    await cloud.signOut()
    expect(cloud.auth.signedOut).toBe(1)
    clash = false
    await cloud.signIn('apple')
    expect(log.some((entry) => entry.startsWith('linkCredential'))).toBe(false)
  })
})

describe('link', () => {
  test('needs a signed-in user', async () => {
    await expect(service(null).link('google')).rejects.toThrow('not-signed-in')
    expect(log).toEqual([])
  })

  test('adds the method and returns the account with it', async () => {
    const user = userWith(APPLE)
    const cloud = service(
      user,
      flowWith({ link: async () => user.providerData.push({ providerId: GOOGLE }) }),
    )
    expect(await cloud.link('google')).toMatchObject({ providers: ['apple', 'google'] })
    expect(log).toEqual(['link:google'])
  })

  test('linking a method already on the account just returns it', async () => {
    const cloud = service(
      userWith(APPLE, GOOGLE),
      flowWith({ link: () => Promise.reject({ code: 'auth/provider-already-linked' }) }),
    )
    expect(await cloud.link('google')).toMatchObject({ providers: ['apple', 'google'] })
  })

  test('an identity that opens another account is a LinkConflictError', async () => {
    for (const code of [
      'auth/credential-already-in-use',
      'auth/account-exists-with-different-credential',
    ]) {
      const cloud = service(userWith(APPLE), flowWith({ link: () => Promise.reject({ code }) }))
      const error = await cloud.link('google').catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(LinkConflictError)
      expect(error).toMatchObject({ provider: 'google' })
    }
  })

  test('other failures pass through', async () => {
    const failure = new Error('network')
    const cloud = service(userWith(APPLE), flowWith({ link: () => Promise.reject(failure) }))
    await expect(cloud.link('google')).rejects.toBe(failure)
  })
})

describe('deleteAccount', () => {
  const erase = async (uid: string): Promise<void> => {
    log.push(`erase:${uid}`)
  }

  test('needs a signed-in user', async () => {
    await expect(service(null).deleteAccount(erase)).rejects.toThrow('not-signed-in')
  })

  test('re-authenticates, then erases, then revokes every linked provider, then deletes', async () => {
    const cloud = service(userWith(GOOGLE, APPLE), flowWith({ revoke: true }))
    await cloud.deleteAccount(erase)
    expect(log).toEqual([
      'available:apple',
      'reauthenticate:apple',
      'erase:u1',
      'revoke:apple',
      'revoke:google',
      'delete',
    ])
  })

  test('re-authenticates with the first linked provider this platform offers', async () => {
    const cloud = service(userWith(APPLE, GOOGLE), flowWith({ available: ['google'] }))
    await cloud.deleteAccount(erase)
    expect(log).toEqual([
      'available:apple',
      'available:google',
      'reauthenticate:google',
      'erase:u1',
      'delete',
    ])
  })

  test('with no provider available here it changes nothing', async () => {
    const cloud = service(userWith(APPLE), flowWith({ available: ['google'] }))
    const error = await cloud.deleteAccount(erase).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ReauthUnavailableError)
    expect(error).toMatchObject({ linked: ['apple'] })
    expect(log).toEqual(['available:apple'])
  })

  test('a failed re-authentication leaves the data and the account alone', async () => {
    const cloud = service(
      userWith(GOOGLE),
      flowWith({ reauthenticate: () => Promise.reject(new Error('cancelled')) }),
    )
    await expect(cloud.deleteAccount(erase)).rejects.toThrow('cancelled')
    expect(log).toEqual(['available:google', 'reauthenticate:google'])
  })

  test('a failed erase does not revoke or delete the account', async () => {
    const cloud = service(userWith(GOOGLE), flowWith({ revoke: true }))
    await expect(cloud.deleteAccount(() => Promise.reject(new Error('offline')))).rejects.toThrow(
      'offline',
    )
    expect(log).toEqual(['available:google', 'reauthenticate:google'])
  })
})
