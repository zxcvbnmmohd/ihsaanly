import type { ReactElement } from 'react'
import { Text, useColorScheme, type TextProps } from 'react-native'

import { colors } from '@/theme/colors'
import { fonts } from '@/theme/fonts'

/** `writingDirection` + `textAlign: auto` right-aligns Arabic without hardcoding a side. */
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
        textAlign: 'auto',
      }}>
      {children}
    </Text>
  )
}
