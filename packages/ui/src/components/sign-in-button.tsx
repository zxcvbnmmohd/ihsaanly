import { Image } from 'expo-image'
import type { ReactElement } from 'react'
import { Pressable, Text } from 'react-native'

import { useUi } from '../provider'
import type { SignInProvider } from '../types'

const GOOGLE_LOGO = require('../../assets/images/google-g.png')

export interface SignInButtonProps {
  provider: SignInProvider
  onPress: () => void
  disabled?: boolean
  /** The button's height in points; the corners are always a full pill. Defaults to 48. */
  height?: number
}

/**
 * Google's "Sign in with Google" branding guidelines
 * (developers.google.com/identity/branding-guidelines): fill, 1pt stroke and
 * text colour per theme, the standard multicolour "G", 12pt before the logo,
 * 10pt between logo and text, text 14/20 medium. Google allows a pill.
 */
const GOOGLE = {
  light: { fill: '#FFFFFF', border: '#747775', text: '#1F1F1F' },
  dark: { fill: '#131314', border: '#8E918F', text: '#E3E3E3' },
} as const

/** Apple's HIG: a black button on light backgrounds, white on dark. */
const APPLE = {
  light: { fill: '#000000', border: '#000000', text: '#FFFFFF' },
  dark: { fill: '#FFFFFF', border: '#FFFFFF', text: '#000000' },
} as const

/**
 * The native branded button. The mobile app draws Google's sign-in with it, as
 * a pill the same height as Apple's own AppleAuthenticationButton (the Google
 * SDK's native button is a fixed-shape rectangle that takes no corner radius).
 * Apple's is drawn by AuthenticationServices on iOS, so the Apple branch here
 * is only a fallback for a host that forgets the official button. The web
 * twin, `sign-in-button.web.tsx`, draws both brands for the browser.
 */
export function SignInButton({
  provider,
  onPress,
  disabled = false,
  height = 48,
}: SignInButtonProps): ReactElement {
  const { strings, scheme } = useUi()
  const google = provider === 'google'
  const colors = (google ? GOOGLE : APPLE)[scheme === 'dark' ? 'dark' : 'light']
  const label = google ? strings.account.signInWithGoogle : strings.account.signInWithApple

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-center justify-center"
      style={{
        height,
        gap: 10,
        paddingHorizontal: 12,
        borderRadius: height / 2,
        backgroundColor: colors.fill,
        borderColor: colors.border,
        borderWidth: 1,
        opacity: disabled ? 0.6 : 1,
      }}>
      {google ? (
        <Image
          source={GOOGLE_LOGO}
          contentFit="contain"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={{ width: 20, height: 20 }}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          color: colors.text,
          fontSize: google ? 14 : 17,
          lineHeight: google ? 20 : 22,
          fontWeight: '500',
          letterSpacing: google ? 0.25 : 0,
        }}>
        {label}
      </Text>
    </Pressable>
  )
}
