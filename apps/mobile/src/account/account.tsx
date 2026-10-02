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
import { type AccountRestore, AccountScreen } from '@ihsaanly/ui/screens/account'
import type { SignInProvider } from '@ihsaanly/ui/types'
import { GoogleSigninButton } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import { type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { Linking, Platform, View } from 'react-native'
import { LEGAL_URLS } from '@/cloud'
import { useEffectiveColorScheme } from '@/theme/store'

interface Thing {
  providers: SignInProvider[]
}

/** Both buttons share a height and the app's pill radius, so neither outranks the other. */
const BUTTON_HEIGHT = 48

/**
 * The providers' own buttons: Apple's is drawn by AuthenticationServices and
 * Google's by its SDK, so titles, logos and localisation are theirs. Neither
 * takes a disabled state that dims it, so while signing in the wrapper dims
 * it and stops touches.
 */
function officialButton(
  scheme: 'light' | 'dark',
  provider: SignInProvider,
  onPress: () => void,
  disabled: boolean,
): ReactNode {
  const button =
    provider === 'apple' ? (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          scheme === 'dark'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={BUTTON_HEIGHT / 2}
        style={{ width: '100%', height: BUTTON_HEIGHT }}
        onPress={onPress}
      />
    ) : (
      <GoogleSigninButton
        size={GoogleSigninButton.Size.Wide}
        color={scheme === 'dark' ? GoogleSigninButton.Color.Dark : GoogleSigninButton.Color.Light}
        disabled={disabled}
        style={{ width: '100%', height: BUTTON_HEIGHT }}
        onPress={onPress}
      />
    )

  return (
    <View
      pointerEvents={disabled ? 'none' : 'auto'}
      accessibilityState={{ disabled }}
      style={{ opacity: disabled ? 0.6 : 1 }}>
      {button}
    </View>
  )
}

interface MobileAccountProps {
  /** Set when onboarding opened this to restore an existing account. */
  restore?: AccountRestore | undefined
}

/**
 * The Account screen with this app's providers and buttons. The (more) route
 * renders it as is; onboarding renders it with `restore` (see restore.tsx).
 */
export function MobileAccount({ restore }: MobileAccountProps): ReactElement {
  const account = useAccount()
  const scheme = useEffectiveColorScheme()
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
      onLink={(provider) => void linkProvider(provider)}
      onCancelLink={() => void cancelLink()}
      legal={{
        termsUrl: LEGAL_URLS.terms,
        privacyUrl: LEGAL_URLS.privacy,
        onOpen: (url) => void Linking.openURL(url),
      }}
      renderSignInButton={(provider, onPress, disabled) =>
        officialButton(scheme, provider, onPress, disabled)
      }
      restore={restore}
    />
  )
}
