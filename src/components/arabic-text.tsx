import type { ReactElement } from 'react'
import { Text, useColorScheme, type TextProps } from 'react-native'

import { colors } from '@/theme/colors'
import { fonts } from '@/theme/fonts'

export interface ArabicTextProps extends TextProps {
  /**
   * 'hero' is the large, centred treatment for a dua's own card, where the
   * Arabic is the item rather than a detail wedged between sections.
   * Default ('inline') hugs the right edge at body size, as it always has.
   */
  variant?: 'inline' | 'hero'
}

/**
 * Arabic reads right to left whatever the interface language is, so the
 * `textAlign: 'right'` default is one of the few places an absolute side is
 * correct. Verified on a device: `textAlign: 'auto'` follows the *layout*
 * direction, not the script, so it pushed Arabic to the left inside an
 * English layout. The 'hero' variant centres instead, which is correct in
 * either layout direction since it is not hugging an edge.
 */
export function ArabicText({
  children,
  variant = 'inline',
  ...props
}: ArabicTextProps): ReactElement {
  useColorScheme()

  return (
    <Text
      {...props}
      // Whatever the interface language, this text is Arabic; without it
      // VoiceOver reads it with the interface voice.
      accessibilityLanguage="ar"
      className={variant === 'hero' ? 'text-4xl leading-loose' : 'text-2xl leading-loose'}
      style={{
        color: colors.label,
        fontFamily: fonts.arabic,
        writingDirection: 'rtl',
        textAlign: variant === 'hero' ? 'center' : 'right',
      }}>
      {children}
    </Text>
  )
}
