import type { ReactElement } from 'react'
import { Pressable, Text } from 'react-native'

import { useUi } from '../provider'
import type { SignInProvider } from '../types'

export interface SignInButtonProps {
  provider: SignInProvider
  onPress: () => void
  disabled?: boolean
}

/**
 * The native fallback. The mobile app never shows it: its Account route passes
 * `renderSignInButton` with the providers' own components
 * (AppleAuthenticationButton, GoogleSigninButton), which this package cannot
 * depend on. The web twin, `sign-in-button.web.tsx`, draws the branded buttons.
 * This one keeps the brand colours and the approved title so a host that
 * forgets the official buttons still shows something acceptable.
 */
export function SignInButton({
  provider,
  onPress,
  disabled = false,
}: SignInButtonProps): ReactElement {
  const { strings, scheme } = useUi()
  const dark = scheme === 'dark'
  const label =
    provider === 'apple' ? strings.account.signInWithApple : strings.account.signInWithGoogle
  const colors =
    provider === 'apple'
      ? dark
        ? { fill: '#FFFFFF', border: '#FFFFFF', text: '#000000' }
        : { fill: '#000000', border: '#000000', text: '#FFFFFF' }
      : dark
        ? { fill: '#131314', border: '#8E918F', text: '#E3E3E3' }
        : { fill: '#FFFFFF', border: '#747775', text: '#1F1F1F' }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="items-center justify-center rounded-full px-4"
      style={{
        height: 44,
        backgroundColor: colors.fill,
        borderColor: colors.border,
        borderWidth: 1,
        opacity: disabled ? 0.6 : 1,
      }}>
      <Text className="font-semibold text-base" style={{ color: colors.text }}>
        {label}
      </Text>
    </Pressable>
  )
}
