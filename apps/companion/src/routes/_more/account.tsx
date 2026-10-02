import { useRestoreOutcome } from '@ihsaanly/state/cloud/restore'
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
import { getOnboarding } from '@ihsaanly/state/onboarding/store'
import { useStrings } from '@ihsaanly/state/strings'
import { AccountScreen } from '@ihsaanly/ui/screens/account'
import type { OnboardingStep } from '@ihsaanly/ui/screens/onboarding'
import type { SignInProvider } from '@ihsaanly/ui/types'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { type ReactElement, useEffect } from 'react'
import { z } from 'zod'
import { PageHeader } from '~/components/page-header'

/** `?from=onboarding`: signing in to restore an account, instead of setting up. */
const accountSearch = z.object({ from: z.literal('onboarding').optional().catch(undefined) })

export const Route = createFileRoute('/_more/account')({
  validateSearch: accountSearch,
  // The root gate lets /account through before onboarding is done; only ever
  // as the restore flow, so the screen always offers the way back to setup.
  beforeLoad: ({ search }) => {
    if (!getOnboarding().completed && search.from !== 'onboarding')
      throw redirect({ to: '/account', search: { from: 'onboarding' }, replace: true })
  },
  component: AccountRoute,
})

const PROVIDERS: SignInProvider[] = ['apple', 'google']

/** Signing in agrees to these; the notice under the buttons links both. */
const LEGAL = {
  termsUrl: 'https://ihsaanly.app/legal/terms',
  privacyUrl: 'https://ihsaanly.app/legal/privacy',
  onOpen: (url: string): void => {
    window.open(url, '_blank', 'noopener')
  },
}

function AccountRoute(): ReactElement {
  const strings = useStrings()
  const account = useAccount()
  const outcome = useRestoreOutcome()
  const navigate = useNavigate()
  const restoring = Route.useSearch().from === 'onboarding'

  // The account's own setup arrived with the first sync: straight to Today,
  // replacing this entry so Back does not land in sign-in again.
  useEffect(() => {
    if (restoring && outcome === 'restored') void navigate({ to: '/today', replace: true })
  }, [restoring, outcome, navigate])

  const toSetup = (step: OnboardingStep): void =>
    void navigate({ to: '/onboarding/$step', params: { step }, replace: true })

  return (
    <>
      <PageHeader title={strings.account.title} back={!restoring} />
      <AccountScreen
        account={account}
        providers={PROVIDERS}
        now={Date.now()}
        onSignIn={(provider) => void signIn(provider)}
        onSyncNow={() => void syncNow()}
        onSignOut={(mode) => void signOut(mode)}
        onResolveMismatch={(mode) => void resolveMismatch(mode)}
        onDeleteAccount={(mode) => void deleteAccount(mode)}
        onLink={(provider) => void linkProvider(provider)}
        onCancelLink={() => void cancelLink()}
        legal={LEGAL}
        restore={
          restoring
            ? {
                outcome,
                onBackToSetup: () => toSetup('welcome'),
                onContinueSetup: () => toSetup('how'),
              }
            : undefined
        }
      />
    </>
  )
}
