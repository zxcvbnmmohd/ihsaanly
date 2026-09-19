import type { ReactElement } from 'react'
import { Text, useColorScheme, type TextProps } from 'react-native'

import { colors } from '@/theme/colors'
import { fonts } from '@/theme/fonts'

/**
 * Arabic reads right to left whatever the interface language is, so this is
 * one of the few places an absolute side is correct. Verified on a device:
 * `textAlign: 'auto'` follows the *layout* direction, not the script, so it
 * pushed Arabic to the left inside an English layout.
 */
export function ArabicText({ children, ...props }: TextProps): ReactElement {
  useColorScheme()

  return (
    <Text
      {...props}
      className="text-2xl leading-loose"
      style={{
        color: colors.label,
        fontFamily: fonts.arabic,
        writingDirection: 'rtl',
        textAlign: 'right',
      }}>
      {children}
    </Text>
  )
}
