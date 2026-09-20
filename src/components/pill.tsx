import type { ReactElement } from 'react'
import { Text, useColorScheme, View, type ColorValue } from 'react-native'

import { colors } from '@/theme/colors'

interface PillProps {
  label: string
  /** Fills the pill when this reading deserves emphasis. */
  emphasis?: boolean
  accent: ColorValue
  onAccent: ColorValue
}

/** A short standing label, so a ruling reads at a glance instead of as detail text. */
export function Pill({ label, emphasis = false, accent, onAccent }: PillProps): ReactElement {
  useColorScheme()

  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{
        backgroundColor: emphasis ? accent : 'transparent',
        borderWidth: emphasis ? 0 : 1,
        borderColor: colors.separator,
        borderCurve: 'continuous',
      }}>
      <Text
        className="text-xs font-semibold"
        style={{ color: emphasis ? onAccent : colors.secondaryLabel }}>
        {label}
      </Text>
    </View>
  )
}
