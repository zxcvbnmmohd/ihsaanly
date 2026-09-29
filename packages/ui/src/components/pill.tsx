import type { ReactElement } from 'react'
import { type ColorValue, Text, View } from 'react-native'

import { useUi } from '../provider'

interface PillProps {
  label: string
  /** Fills the pill when this reading deserves emphasis. */
  emphasis?: boolean
  accent: ColorValue
  onAccent: ColorValue
}

/** A short standing label, so a ruling reads at a glance instead of as detail text. */
export function Pill({ label, emphasis = false, accent, onAccent }: PillProps): ReactElement {
  const { systemColors } = useUi()

  return (
    <View
      className="self-start rounded-full px-2.5 py-1"
      style={{
        borderColor: systemColors.separator,
        backgroundColor: emphasis ? accent : 'transparent',
        borderWidth: emphasis ? 0 : 1,
        borderCurve: 'continuous',
      }}>
      <Text
        className="font-semibold text-xs"
        style={{ color: emphasis ? onAccent : systemColors.secondaryLabel }}>
        {label}
      </Text>
    </View>
  )
}
