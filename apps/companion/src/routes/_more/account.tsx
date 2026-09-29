import {
  deleteAccount,
  resolveMismatch,
  signIn,
  signOut,
  syncNow,
  useAccount,
} from '@ihsaanly/state/cloud/session'
import { useStrings } from '@ihsaanly/state/strings'
import { AccountScreen } from '@ihsaanly/ui/screens/account'
import type { SignInProvider } from '@ihsaanly/ui/types'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/_more/account')({ component: AccountRoute })

const PROVIDERS: SignInProvider[] = ['apple', 'google']

function AccountRoute(): ReactElement {
  const strings = useStrings()
  const account = useAccount()

  return (
    <>
      <PageHeader title={strings.account.title} />
      <AccountScreen
        account={account}
        providers={PROVIDERS}
        now={Date.now()}
        onSignIn={(provider) => void signIn(provider)}
        onSyncNow={() => void syncNow()}
        onSignOut={(mode) => void signOut(mode)}
        onResolveMismatch={(mode) => void resolveMismatch(mode)}
        onDeleteAccount={(mode) => void deleteAccount(mode)}
      />
    </>
  )
}
