import { afterEach, describe, expect, it, mock } from 'bun:test'
import { fireEvent, screen, within } from '@testing-library/react'
import { AccessibilityInfo, Platform } from 'react-native'
import { named, renderScreen } from '../../test/render'
import type { AccountView } from '../types'
import { AccountScreen, type AccountScreenProps } from './account'
import {
  accountLinkRequiredFixture,
  accountNeedsSetupFixture,
  accountRestoringFixture,
  accountSignedInFixture,
  accountSignedOutFixture,
} from './fixtures'

const platform = Platform as { OS: string }

afterEach(() => {
  platform.OS = 'web'
})

function signedIn(change: Partial<AccountView> = {}): AccountScreenProps {
  return {
    ...accountSignedInFixture,
    account: { ...accountSignedInFixture.account, ...change },
  }
}

const identity = accountSignedInFixture.account.account as NonNullable<AccountView['account']>

describe('AccountScreen, signed out', () => {
  it('offers sign-in for each provider the host has and reports the press', async () => {
    const onSignIn = mock((_provider: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen {...accountSignedOutFixture} onSignIn={onSignIn} />,
    )
    expect(screen.getByText(strings.account.explanation)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.account.signInWithApple }))
    await user.click(screen.getByRole('button', { name: strings.account.signInWithGoogle }))
    expect(onSignIn.mock.calls.map(([provider]) => provider)).toEqual(['apple', 'google'])
  })

  it('offers only the providers the host supports', () => {
    const { strings } = renderScreen(
      <AccountScreen {...accountSignedOutFixture} providers={['google']} />,
    )
    expect(screen.queryByRole('button', { name: strings.account.signInWithApple })).toBeNull()
    expect(
      screen.getByRole('button', { name: strings.account.signInWithGoogle }),
    ).toBeInTheDocument()
  })

  it('shows the data notice with Terms and Privacy as plain words without links', () => {
    const { strings } = renderScreen(<AccountScreen {...accountSignedOutFixture} />)
    expect(screen.getByText(strings.account.notice)).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
    expect(
      screen.getByText(/By continuing, you agree to the Terms and the Privacy Policy\./),
    ).toBeInTheDocument()
  })

  it('links Terms and Privacy as real anchors on the web', () => {
    const onOpen = mock((_url: string) => {})
    const { strings } = renderScreen(
      <AccountScreen
        {...accountSignedOutFixture}
        legal={{ termsUrl: 'https://x.test/terms', privacyUrl: 'https://x.test/privacy', onOpen }}
      />,
    )
    const terms = screen.getByRole('link', { name: strings.account.terms })
    expect(terms).toHaveAttribute('href', 'https://x.test/terms')
    expect(terms).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: strings.account.privacy })).toHaveAttribute(
      'href',
      'https://x.test/privacy',
    )
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('hands the URL to the host to open on native', async () => {
    platform.OS = 'ios'
    const onOpen = mock((_url: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen
        {...accountSignedOutFixture}
        legal={{ termsUrl: 'https://x.test/terms', privacyUrl: 'https://x.test/privacy', onOpen }}
      />,
    )
    await user.click(screen.getByText(strings.account.privacy))
    expect(onOpen).toHaveBeenCalledWith('https://x.test/privacy')
  })

  it('draws the host’s own sign-in buttons when it has them', async () => {
    const onSignIn = mock((_provider: string) => {})
    const render = mock((provider: string, press: () => void, disabled: boolean) => (
      <button type="button" disabled={disabled} onClick={press}>{`Official ${provider}`}</button>
    ))
    const { user } = renderScreen(
      <AccountScreen
        {...accountSignedOutFixture}
        onSignIn={onSignIn}
        renderSignInButton={render}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Official google' }))
    expect(onSignIn).toHaveBeenCalledWith('google')
    expect(render).toHaveBeenCalledWith('apple', expect.any(Function), false)
  })

  it('disables the buttons and says so while signing in', () => {
    const { strings } = renderScreen(
      <AccountScreen
        {...accountSignedOutFixture}
        account={{ ...accountSignedOutFixture.account, status: 'syncing' }}
      />,
    )
    expect(screen.getByText(strings.account.signingIn)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: strings.account.signInWithApple })).toBeDisabled()
  })

  it('announces a failed sign-in with its reason', () => {
    const { strings } = renderScreen(
      <AccountScreen
        {...accountSignedOutFixture}
        account={{ ...accountSignedOutFixture.account, status: 'error', error: 'network' }}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(strings.account.signInFailed)).toBeInTheDocument()
    expect(within(alert).getByText(strings.account.errors.network)).toBeInTheDocument()
  })

  it('renders in dark mode in another language', () => {
    const { strings } = renderScreen(<AccountScreen {...accountSignedOutFixture} />, {
      scheme: 'dark',
      locale: 'ar',
    })
    expect(screen.getByText(strings.account.explanation)).toBeInTheDocument()
  })
})

describe('AccountScreen, link required', () => {
  it('asks to continue with the existing provider, or to cancel', async () => {
    const onSignIn = mock((_provider: string) => {})
    const onCancelLink = mock(() => {})
    const { user, strings } = renderScreen(
      <AccountScreen
        {...accountLinkRequiredFixture}
        onSignIn={onSignIn}
        onCancelLink={onCancelLink}
      />,
    )
    expect(screen.getByText(strings.account.linkTitle)).toBeInTheDocument()
    expect(screen.getByText(strings.account.linkBody('Apple', 'Google'))).toBeInTheDocument()
    // Only the existing provider's button, not both.
    expect(screen.queryByRole('button', { name: strings.account.signInWithGoogle })).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.account.signInWithApple }))
    expect(onSignIn).toHaveBeenCalledWith('apple')
    await user.click(screen.getByRole('button', { name: strings.account.cancel }))
    expect(onCancelLink).toHaveBeenCalledTimes(1)
  })

  it('says where to link when the existing provider is not offered here', () => {
    const { strings } = renderScreen(
      <AccountScreen {...accountLinkRequiredFixture} providers={['google']} />,
    )
    expect(screen.getByText(strings.account.linkUnavailable)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.account.signInWithApple })).toBeNull()
    expect(screen.getByRole('button', { name: strings.account.cancel })).toBeInTheDocument()
  })

  it('puts focus on the question when it appears', () => {
    const { strings } = renderScreen(<AccountScreen {...accountLinkRequiredFixture} />)
    expect(screen.getByRole('heading', { name: strings.account.linkTitle })).toHaveFocus()
  })
})

describe('AccountScreen, signed in', () => {
  it('shows who is signed in, the method and the sync state', () => {
    const { strings } = renderScreen(<AccountScreen {...accountSignedInFixture} />)
    expect(screen.getByText('Aisha')).toBeInTheDocument()
    expect(screen.getByText('aisha@example.com')).toBeInTheDocument()
    expect(screen.getByText(strings.account.signedInWith.google)).toBeInTheDocument()
    expect(
      screen.getByText(strings.account.lastSynced(strings.account.minutesAgo(5))),
    ).toBeInTheDocument()
    expect(screen.getByText(strings.account.upToDate)).toBeInTheDocument()
  })

  it('shows only the email when there is no name, and only a name when there is no email', () => {
    const { unmount, strings } = renderScreen(
      <AccountScreen {...signedIn({ account: { ...identity, displayName: null } })} />,
    )
    expect(screen.getByText('aisha@example.com')).toBeInTheDocument()
    expect(screen.queryByText('Aisha')).toBeNull()
    expect(screen.getByText(strings.account.signedInWith.google)).toBeInTheDocument()
    unmount()
    renderScreen(<AccountScreen {...signedIn({ account: { ...identity, email: null } })} />)
    expect(screen.getByText('Aisha')).toBeInTheDocument()
    expect(screen.queryByText('aisha@example.com')).toBeNull()
  })

  it.each([
    [null, 'neverSynced'],
    [Date.UTC(2026, 8, 29, 12), 'justNow'],
    [Date.UTC(2026, 8, 29, 9), 'hours'],
    [Date.UTC(2026, 8, 26, 12), 'days'],
    [Date.UTC(2026, 8, 29, 13), 'future'],
  ] as const)('reads %p relative to now', (lastSyncedAt, expected) => {
    const { strings } = renderScreen(<AccountScreen {...signedIn({ lastSyncedAt })} />)
    const line: Record<string, string> = {
      neverSynced: strings.account.neverSynced,
      justNow: strings.account.lastSynced(strings.account.justNow),
      hours: strings.account.lastSynced(strings.account.hoursAgo(3)),
      days: strings.account.lastSynced(strings.account.daysAgo(3)),
      future: strings.account.lastSynced(strings.account.justNow),
    }
    expect(screen.getByText(line[expected] as string)).toBeInTheDocument()
  })

  it('says syncing while it runs, and cannot sync again or link', async () => {
    const onSyncNow = mock(() => {})
    const { user, strings } = renderScreen(
      <AccountScreen
        {...signedIn({ status: 'syncing', account: { ...identity, providers: ['google'] } })}
        providers={['apple', 'google']}
        onSyncNow={onSyncNow}
      />,
    )
    expect(screen.getByText(strings.account.syncing)).toBeInTheDocument()
    await user.click(screen.getByText(strings.account.syncNow))
    expect(onSyncNow).not.toHaveBeenCalled()
  })

  it('syncs now when idle', async () => {
    const onSyncNow = mock(() => {})
    const { user, strings } = renderScreen(
      <AccountScreen {...accountSignedInFixture} onSyncNow={onSyncNow} />,
    )
    await user.click(screen.getByRole('button', { name: strings.account.syncNow }))
    expect(onSyncNow).toHaveBeenCalledTimes(1)
  })

  it('shows a sync failure, or the specific error behind it', () => {
    const { unmount, strings } = renderScreen(
      <AccountScreen {...signedIn({ status: 'error', error: 'sync' })} />,
    )
    expect(screen.getByText(strings.account.syncFailed)).toBeInTheDocument()
    unmount()
    const second = renderScreen(<AccountScreen {...signedIn({ status: 'error', error: null })} />)
    expect(screen.getByText(second.strings.account.syncFailed)).toBeInTheDocument()
    second.unmount()
    renderScreen(<AccountScreen {...signedIn({ status: 'error', error: 'link-conflict' })} />)
    expect(screen.getByText(strings.account.errors['link-conflict'])).toBeInTheDocument()
  })

  it('lists linked methods and offers to link the others', async () => {
    const onLink = mock((_provider: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen {...accountSignedInFixture} onLink={onLink} />,
    )
    expect(screen.getByLabelText(strings.account.methodLinked('Google'))).toBeInTheDocument()
    expect(screen.getByText(strings.account.methodsHint)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.account.linkProvider('Apple') }))
    expect(onLink).toHaveBeenCalledWith('apple')
  })

  it('has nothing to link when every offered method is linked', () => {
    const { strings } = renderScreen(
      <AccountScreen {...signedIn({ account: { ...identity, providers: ['apple', 'google'] } })} />,
    )
    expect(screen.getByLabelText(strings.account.methodLinked('Apple'))).toBeInTheDocument()
    expect(screen.queryByText(strings.account.methodsHint)).toBeNull()
  })

  it('resolves an account mismatch either way', async () => {
    const onResolveMismatch = mock((_mode: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen
        {...signedIn({ status: 'account-mismatch' })}
        onResolveMismatch={onResolveMismatch}
      />,
    )
    expect(screen.getByRole('heading', { name: strings.account.mismatchTitle })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.account.merge }))
    await user.click(screen.getByRole('button', { name: strings.account.fresh }))
    expect(onResolveMismatch.mock.calls.map(([mode]) => mode)).toEqual(['merge', 'fresh'])
  })
})

describe('AccountScreen, sign out and delete', () => {
  it.each([
    ['keepData', 'keep'],
    ['removeData', 'remove'],
  ] as const)('signs out choosing %s', async (key, mode) => {
    const onSignOut = mock((_mode: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen {...accountSignedInFixture} onSignOut={onSignOut} />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.account.signOut) }))
    expect(screen.getByRole('heading', { name: strings.account.signOutTitle })).toHaveFocus()
    // The rows give way to the question.
    expect(screen.queryByRole('button', { name: strings.account.syncNow })).toBeNull()
    await user.click(screen.getByRole('button', { name: strings.account[key] }))
    expect(onSignOut).toHaveBeenCalledWith(mode)
    expect(screen.getByRole('button', { name: strings.account.syncNow })).toBeInTheDocument()
  })

  it('cancels a sign-out and returns focus to the row that asked', async () => {
    const onSignOut = mock((_mode: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen {...accountSignedInFixture} onSignOut={onSignOut} />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.account.signOut) }))
    await user.click(screen.getByRole('button', { name: strings.account.cancel }))
    expect(onSignOut).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: named(strings.account.signOut) })).toHaveFocus()
  })

  it('closes a question on Escape', async () => {
    const { user, strings } = renderScreen(<AccountScreen {...accountSignedInFixture} />)
    await user.click(screen.getByRole('button', { name: named(strings.account.deleteAccount) }))
    expect(screen.getByRole('heading', { name: strings.account.deleteTitle })).toBeInTheDocument()
    await user.keyboard('x')
    expect(screen.getByRole('heading', { name: strings.account.deleteTitle })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('heading', { name: strings.account.deleteTitle })).toBeNull()
    expect(screen.getByRole('button', { name: named(strings.account.deleteAccount) })).toHaveFocus()
  })

  it('asks twice before deleting, and passes the data choice', async () => {
    const onDeleteAccount = mock((_mode: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen {...accountSignedInFixture} onDeleteAccount={onDeleteAccount} />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.account.deleteAccount) }))
    await user.click(screen.getByRole('button', { name: strings.account.deleteConfirm }))
    expect(screen.getByRole('heading', { name: strings.account.deleteChoiceTitle })).toHaveFocus()
    expect(onDeleteAccount).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: strings.account.removeData }))
    expect(onDeleteAccount).toHaveBeenCalledWith('remove')
  })

  it('can keep the device data when deleting', async () => {
    const onDeleteAccount = mock((_mode: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen {...accountSignedInFixture} onDeleteAccount={onDeleteAccount} />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.account.deleteAccount) }))
    await user.click(screen.getByRole('button', { name: strings.account.deleteConfirm }))
    await user.click(screen.getByRole('button', { name: strings.account.keepData }))
    expect(onDeleteAccount).toHaveBeenCalledWith('keep')
  })

  it('backs out of the delete questions', async () => {
    const onDeleteAccount = mock((_mode: string) => {})
    const { user, strings } = renderScreen(
      <AccountScreen {...accountSignedInFixture} onDeleteAccount={onDeleteAccount} />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.account.deleteAccount) }))
    await user.click(screen.getByRole('button', { name: strings.account.cancel }))
    await user.click(screen.getByRole('button', { name: named(strings.account.deleteAccount) }))
    await user.click(screen.getByRole('button', { name: strings.account.deleteConfirm }))
    await user.click(screen.getByRole('button', { name: strings.account.cancel }))
    expect(onDeleteAccount).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: named(strings.account.deleteAccount) })).toHaveFocus()
  })

  it('moves screen-reader focus on native instead of DOM focus', async () => {
    platform.OS = 'ios'
    const info = AccessibilityInfo as unknown as Record<string, unknown>
    const original = info.sendAccessibilityEvent
    const send = mock((_view: unknown, _event: string) => {})
    info.sendAccessibilityEvent = send
    try {
      const { user, strings } = renderScreen(<AccountScreen {...accountSignedInFixture} />)
      await user.click(screen.getByRole('button', { name: named(strings.account.signOut) }))
      expect(send).toHaveBeenCalledWith(expect.anything(), 'focus')
      // Escape does nothing off the web.
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(
        screen.getByRole('heading', { name: strings.account.signOutTitle }),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: strings.account.cancel }))
      expect(send.mock.calls.length).toBeGreaterThan(1)
    } finally {
      info.sendAccessibilityEvent = original
    }
  })
})

describe('AccountScreen, restoring from onboarding', () => {
  it('invites signing in, with a way back to setup', async () => {
    const onBackToSetup = mock(() => {})
    const { user, strings } = renderScreen(
      <AccountScreen
        {...accountSignedOutFixture}
        restore={{ outcome: 'idle', onBackToSetup, onContinueSetup: () => {} }}
      />,
    )
    expect(screen.getByText(strings.account.restore.intro)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.account.restore.backToSetup }))
    expect(onBackToSetup).toHaveBeenCalledTimes(1)
  })

  it('says it is restoring while the first sync runs', () => {
    const { strings } = renderScreen(<AccountScreen {...accountRestoringFixture} />)
    expect(screen.getByText(strings.account.restore.restoring)).toBeInTheDocument()
    expect(screen.getByText('Aisha')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.account.syncNow })).toBeNull()
  })

  it('offers to continue setup for an account that never finished it', async () => {
    const onContinueSetup = mock(() => {})
    const restore = accountNeedsSetupFixture.restore
    if (!restore) throw new Error('fixture has no restore')
    const { user, strings } = renderScreen(
      <AccountScreen {...accountNeedsSetupFixture} restore={{ ...restore, onContinueSetup }} />,
    )
    expect(
      screen.getByRole('heading', { name: strings.account.restore.needsSetupTitle }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: strings.account.restore.continueSetup }))
    expect(onContinueSetup).toHaveBeenCalledTimes(1)
  })

  it('confirms the restore, and asks about reminders only when the host can', async () => {
    const onAllow = mock(() => {})
    const onNotNow = mock(() => {})
    const { user, strings, unmount } = renderScreen(
      <AccountScreen
        {...accountSignedInFixture}
        restore={{ outcome: 'restored', onBackToSetup: () => {}, onContinueSetup: () => {} }}
      />,
    )
    expect(screen.getByText(strings.account.restore.restored)).toBeInTheDocument()
    expect(screen.queryByText(strings.account.restore.remindersTitle)).toBeNull()
    unmount()

    renderScreen(
      <AccountScreen
        {...accountSignedInFixture}
        restore={{
          outcome: 'restored',
          onBackToSetup: () => {},
          onContinueSetup: () => {},
          reminders: { onAllow, onNotNow },
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: strings.onboarding.allowReminders }))
    await user.click(screen.getByRole('button', { name: strings.onboarding.notNow }))
    expect(onAllow).toHaveBeenCalledTimes(1)
    expect(onNotNow).toHaveBeenCalledTimes(1)
  })

  it('falls through to the ordinary view while the outcome is idle', () => {
    const { strings } = renderScreen(
      <AccountScreen
        {...signedIn({ status: 'error', error: 'network' })}
        restore={{ outcome: 'idle', onBackToSetup: () => {}, onContinueSetup: () => {} }}
      />,
    )
    expect(screen.getByText(strings.account.errors.network)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: strings.account.restore.backToSetup }),
    ).toBeInTheDocument()
  })
})
