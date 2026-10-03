/**
 * Fakes for the sign-in UI: the provider buttons and the Account screen,
 * recording the props they are given. The key sets match what other test
 * files register for the same modules (a module's keys are fixed by whichever
 * mock is loaded first), so these are supersets of every use.
 */
import { mock } from 'bun:test'
import type { ReactElement } from 'react'

export const buttons = {
  apple: [] as Record<string, unknown>[],
  google: [] as Record<string, unknown>[],
  appleAvailable: true,
}

export const screens = { account: [] as Record<string, unknown>[] }

export function installProviderButtons(): void {
  mock.module('expo-apple-authentication', () => ({
    AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
    AppleAuthenticationButtonType: { SIGN_IN: 0 },
    AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 },
    AppleAuthenticationButton: (props: Record<string, unknown>): ReactElement | null => {
      buttons.apple.push(props)
      return null
    },
    isAvailableAsync: async () => buttons.appleAvailable,
    signInAsync: async () => ({ identityToken: 'apple-jwt' }),
  }))
  mock.module('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
      configure: () => {},
      hasPlayServices: async () => true,
      signIn: async () => ({ type: 'cancelled' }),
    },
    GoogleSigninButton: Object.assign(
      (props: Record<string, unknown>): ReactElement | null => {
        buttons.google.push(props)
        return null
      },
      { Size: { Wide: 1 }, Color: { Dark: 0, Light: 1 } },
    ),
  }))
  mock.module('@ihsaanly/ui/screens/account', () => ({
    AccountScreen: (props: Record<string, unknown>): ReactElement | null => {
      screens.account.push(props)
      return null
    },
  }))
}

/** react-native-safe-area-context reads a native context; a fixed inset is enough in tests. */
export function installSafeArea(top = 0): void {
  // EdgeInsets is a physical-edge API, not a style; built from entries to say so.
  const insets = Object.fromEntries([
    ['top', top],
    ['bottom', 0],
    ['left', 0],
    ['right', 0],
  ])
  mock.module('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => insets,
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    SafeAreaView: ({ children }: { children: unknown }) => children,
  }))
}
