import { beforeEach, describe, expect, it } from 'bun:test'
import type { Account } from '@ihsaanly/cloud/ports'
import { screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'
import { resetSession, sessionCalls, setAccount } from '../../test/session-mock'

const google: Account = {
  uid: 'user-1',
  provider: 'google',
  email: 'a@b.co',
  displayName: 'Aisha',
  providers: ['google'],
}

beforeEach(() => {
  resetApp()
  resetSession()
})

describe('/account signed out', () => {
  it('offers Google only, and links the legal pages', async () => {
    const { user } = await renderRoute('/account')
    expect(await screen.findByRole('heading', { name: strings.account.title })).toBeInTheDocument()
    expect(screen.queryByText(strings.account.continueWithApple)).toBeNull()
    expect(screen.getByRole('link', { name: strings.account.terms })).toHaveAttribute(
      'href',
      'https://ihsaanly.app/legal/terms',
    )
    expect(screen.getByRole('link', { name: strings.account.privacy })).toHaveAttribute(
      'href',
      'https://ihsaanly.app/legal/privacy',
    )

    await user.click(
      screen.getByRole('button', { name: new RegExp(strings.account.signInWithGoogle) }),
    )
    expect(sessionCalls).toEqual([{ name: 'signIn', args: ['google'] }])
  })

  it('leaves the link prompt without signing in', async () => {
    setAccount({ link: { existing: 'google', attempted: 'apple' } })
    const { user } = await renderRoute('/account')
    await user.click(await screen.findByRole('button', { name: strings.account.cancel }))
    expect(sessionCalls).toEqual([{ name: 'cancelLink', args: [] }])
  })
})

describe('/account signed in', () => {
  it('syncs now', async () => {
    setAccount({ status: 'idle', account: google, lastSyncedAt: null })
    const { user } = await renderRoute('/account')
    expect(await screen.findByText('Aisha')).toBeInTheDocument()
    await user.click(screen.getByText(strings.account.syncNow))
    expect(sessionCalls).toEqual([{ name: 'syncNow', args: [] }])
  })

  it('signs out, keeping or removing the data on this device', async () => {
    setAccount({ status: 'idle', account: google })
    const { user } = await renderRoute('/account')
    await user.click(await screen.findByText(strings.account.signOut))
    await user.click(screen.getByRole('button', { name: strings.account.keepData }))
    await user.click(screen.getByText(strings.account.signOut))
    await user.click(screen.getByRole('button', { name: strings.account.removeData }))
    expect(sessionCalls).toEqual([
      { name: 'signOut', args: ['keep'] },
      { name: 'signOut', args: ['remove'] },
    ])
  })

  it('deletes the account, after asking what happens to the data here', async () => {
    setAccount({ status: 'idle', account: google })
    const { user } = await renderRoute('/account')
    await user.click(await screen.findByText(strings.account.deleteAccount))
    await user.click(screen.getByRole('button', { name: strings.account.deleteConfirm }))
    await user.click(screen.getByRole('button', { name: strings.account.removeData }))
    expect(sessionCalls).toEqual([{ name: 'deleteAccount', args: ['remove'] }])
  })

  it('merges or starts fresh when the device holds another account’s data', async () => {
    setAccount({ status: 'account-mismatch', account: google, mismatchUid: 'someone-else' })
    const { user } = await renderRoute('/account')
    await user.click(await screen.findByRole('button', { name: strings.account.merge }))
    await user.click(screen.getByRole('button', { name: strings.account.fresh }))
    expect(sessionCalls).toEqual([
      { name: 'resolveMismatch', args: ['merge'] },
      { name: 'resolveMismatch', args: ['fresh'] },
    ])
  })

  it('links Google to an account that signed in another way', async () => {
    setAccount({ status: 'idle', account: { ...google, provider: 'apple', providers: ['apple'] } })
    const { user } = await renderRoute('/account')
    await user.click(
      await screen.findByRole('button', { name: strings.account.linkProvider('Google') }),
    )
    expect(sessionCalls).toEqual([{ name: 'linkProvider', args: ['google'] }])
  })
})
