import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { getAccountState } from '@ihsaanly/state/cloud/session'
import { getOnboarding, setOnboarding } from '@ihsaanly/state/onboarding/store'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, resetApp, startUsing } from '../../test/app'
import { connectMemoryCloud, type MemoryCloud } from '../../test/memory-cloud'

let connected: MemoryCloud | null = null

beforeEach(async () => {
  await resetApp()
})

afterEach(async () => {
  await connected?.stop()
  connected = null
})

const signedInStatus = (): string => getAccountState().status

describe('while onboarding is unfinished', () => {
  it('is the restore flow: sign-in with a way back to setup', async () => {
    const app = await renderApp('/account')
    expect(await screen.findByText(en.account.restore.intro)).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: en.account.restore.backToSetup }))
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/onboarding/welcome'))
  })

  it('goes on with setup after signing in to an account that has none', async () => {
    connected = await connectMemoryCloud()
    const app = await renderApp('/account?from=onboarding')
    await app.user.click(await screen.findByRole('button', { name: en.account.signInWithGoogle }))
    await app.user.click(
      await screen.findByRole('button', { name: en.account.restore.continueSetup }),
    )
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/onboarding/how'))
  })

  it('lands on Today once the account is restored', async () => {
    connected = await connectMemoryCloud()
    const app = await renderApp('/account?from=onboarding')
    await app.user.click(await screen.findByRole('button', { name: en.account.signInWithGoogle }))
    await screen.findByText(en.account.restore.needsSetupTitle)
    setOnboarding({ ...getOnboarding(), completed: true })
    await waitFor(() => expect(app.router.state.location.pathname).toBe('/today'))
  })
})

describe('signed out, after onboarding', () => {
  beforeEach(startUsing)

  it('offers both providers and links the Terms and Privacy Policy as real anchors', async () => {
    await renderApp('/account')
    expect(
      await screen.findByRole('button', { name: en.account.signInWithApple }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.account.signInWithGoogle })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: en.account.terms })).toHaveAttribute(
      'href',
      'https://ihsaanly.app/legal/terms',
    )
    expect(screen.getByRole('link', { name: en.account.privacy })).toHaveAttribute(
      'href',
      'https://ihsaanly.app/legal/privacy',
    )
  })

  it('says so when signing in cannot start (a local-only build)', async () => {
    const app = await renderApp('/account')
    await app.user.click(await screen.findByRole('button', { name: en.account.signInWithGoogle }))
    expect(await screen.findByText(en.account.signInFailed)).toBeInTheDocument()
  })

  it('offers the other provider when the email already has an account, and can be cancelled', async () => {
    connected = await connectMemoryCloud({
      seed: [{ uid: 'u1', email: 'same@example.test', providers: ['apple'] }],
      emails: { google: 'same@example.test', apple: 'same@example.test' },
    })
    const app = await renderApp('/account')
    await app.user.click(await screen.findByRole('button', { name: en.account.signInWithGoogle }))
    expect(await screen.findByText(en.account.linkTitle)).toBeInTheDocument()

    await app.user.click(screen.getByRole('button', { name: en.account.cancel }))
    await waitFor(() => expect(screen.queryByText(en.account.linkTitle)).toBeNull())

    await app.user.click(screen.getByRole('button', { name: en.account.signInWithGoogle }))
    await app.user.click(await screen.findByRole('button', { name: en.account.signInWithApple }))
    expect(await screen.findByText(en.account.signedInWith.apple)).toBeInTheDocument()
  })
})

describe('signed in', () => {
  beforeEach(async () => {
    await startUsing()
    connected = await connectMemoryCloud({ uid: 'me' })
  })

  async function signIn(): Promise<Awaited<ReturnType<typeof renderApp>>> {
    const app = await renderApp('/account')
    await app.user.click(await screen.findByRole('button', { name: en.account.signInWithGoogle }))
    await screen.findByText(en.account.signedInWith.google)
    await waitFor(() => expect(signedInStatus()).toBe('idle'))
    return app
  }

  it('shows who is signed in and when it last synced, and syncs on request', async () => {
    const app = await signIn()
    expect(screen.getByText('google@example.test')).toBeInTheDocument()
    await app.user.click(screen.getByRole('button', { name: new RegExp(`^${en.account.syncNow}`) }))
    await waitFor(() =>
      expect(screen.getByText(en.account.lastSynced(en.account.justNow))).toBeInTheDocument(),
    )
  })

  it('links the other provider', async () => {
    const app = await signIn()
    await app.user.click(screen.getByRole('button', { name: en.account.linkProvider('Apple') }))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: en.account.linkProvider('Apple') })).toBeNull(),
    )
    expect(getAccountState().account?.providers).toEqual(['apple', 'google'])
  })

  it("signs out keeping this device's data", async () => {
    const app = await signIn()
    await app.user.click(screen.getByRole('button', { name: new RegExp(`^${en.account.signOut}`) }))
    await app.user.click(await screen.findByRole('button', { name: en.account.keepData }))
    await waitFor(() => expect(getAccountState().account).toBeNull())
    expect(connected?.wipes()).toBe(0)
    expect(
      await screen.findByRole('button', { name: en.account.signInWithGoogle }),
    ).toBeInTheDocument()
  })

  it("signs out and removes this device's data", async () => {
    const app = await signIn()
    await app.user.click(screen.getByRole('button', { name: new RegExp(`^${en.account.signOut}`) }))
    await app.user.click(await screen.findByRole('button', { name: en.account.removeData }))
    await waitFor(() => expect(connected?.wipes()).toBe(1))
  })

  it("deletes the account, then asks what to do with this device's data", async () => {
    const app = await signIn()
    await app.user.click(
      screen.getByRole('button', { name: new RegExp(`^${en.account.deleteAccount}`) }),
    )
    await app.user.click(await screen.findByRole('button', { name: en.account.deleteConfirm }))
    await app.user.click(await screen.findByRole('button', { name: en.account.keepData }))
    await waitFor(() => expect(getAccountState().account).toBeNull())
  })

  it('asks what to do with data from another account, and merges', async () => {
    const app = await signIn()
    await connected?.stop()
    // The same device, now offered a different account.
    connected = await connectMemoryCloud({ uid: 'someone-else' })
    app.unmount()
    const second = await renderApp('/account')
    await second.user.click(
      await screen.findByRole('button', { name: en.account.signInWithGoogle }),
    )
    await second.user.click(await screen.findByRole('button', { name: en.account.merge }))
    await waitFor(() => expect(signedInStatus()).toBe('idle'))
  })

  it('or starts fresh on this device', async () => {
    const app = await signIn()
    await connected?.stop()
    connected = await connectMemoryCloud({ uid: 'someone-else' })
    app.unmount()
    const second = await renderApp('/account')
    await second.user.click(
      await screen.findByRole('button', { name: en.account.signInWithGoogle }),
    )
    await second.user.click(await screen.findByRole('button', { name: en.account.fresh }))
    await waitFor(() => expect(signedInStatus()).toBe('idle'))
  })
})
