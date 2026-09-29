import {
  deleteAccount,
  resolveMismatch,
  signIn,
  signOut,
  syncNow,
  useAccount,
} from '@ihsaanly/state/cloud/session'
import { AccountScreen } from '@ihsaanly/ui/screens/account'
import type { SignInProvider } from '@ihsaanly/ui/types'
import * as AppleAuthentication from 'expo-apple-authentication'
import { type ReactElement, useEffect, useState } from 'react'
import { Platform } from 'react-native'

interface Thing {
  providers: SignInProvider[]
}

export default function AccountRoute(): ReactElement {
  const account = useAccount()
  const [thing, setThing] = useState<Thing>({ providers: ['google'] })

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    void AppleAuthentication.isAvailableAsync().then((available) => {
      if (available) setThing({ providers: ['apple', 'google'] })
    })
  }, [])

  return (
    <AccountScreen
      account={account}
      providers={thing.providers}
      now={Date.now()}
      onSignIn={(provider) => void signIn(provider)}
      onSyncNow={() => void syncNow()}
      onSignOut={(mode) => void signOut(mode)}
      onResolveMismatch={(mode) => void resolveMismatch(mode)}
      onDeleteAccount={(mode) => void deleteAccount(mode)}
    />
  )
}
