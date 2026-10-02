import {
  cancelLink,
  deleteAccount,
  linkProvider,
  resolveMismatch,
  signIn,
  signOut,
  syncNow,
  useAccount,
} from '@ihsaanly/state/cloud/session'
import { AccountScreen } from '@ihsaanly/ui/screens/account'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'
import { useExtensionStrings } from '~/strings'

export const Route = createFileRoute('/account')({ component: AccountRoute })

/** The extension has no Apple flow, so Google is the only button. */
const PROVIDERS = ['google'] as const

/** Signing in agrees to these; the notice under the buttons links both. */
const LEGAL = {
  termsUrl: 'https://ihsaanly.app/legal/terms',
  privacyUrl: 'https://ihsaanly.app/legal/privacy',
  onOpen: (url: string): void => {
    window.open(url, '_blank', 'noopener')
  },
}

function AccountRoute(): ReactElement {
  const strings = useExtensionStrings()
  const account = useAccount()

  return (
    <>
      <PageHeader title={strings.account.title} />
      <AccountScreen
        account={account}
        providers={[...PROVIDERS]}
        now={Date.now()}
        onSignIn={(provider) => void signIn(provider)}
        onSyncNow={() => void syncNow()}
        onSignOut={(mode) => void signOut(mode)}
        onResolveMismatch={(mode) => void resolveMismatch(mode)}
        onDeleteAccount={(mode) => void deleteAccount(mode)}
        onLink={(provider) => void linkProvider(provider)}
        onCancelLink={() => void cancelLink()}
        legal={LEGAL}
      />
    </>
  )
}
