import type { ReactElement } from 'react'
import { Pressable, Text, useColorScheme } from 'react-native'

import { colors, type Palette } from '@/theme/colors'

interface ChipProps {
  label: string
  selected: boolean
  onPress: () => void
  palette: Palette
}

/** One of a few choices in a row; filled when it is the one in force. */
export function Chip({ label, selected, onPress, palette }: ChipProps): ReactElement {
  useColorScheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // px-3 py-2 is about 36pt tall; the slop carries it to the 44pt minimum
      // without making the pill itself look heavy in a row of them.
      hitSlop={6}
      className="rounded-full px-3 py-2"
      style={{ backgroundColor: selected ? palette.accent : colors.secondarySystemBackground }}>
      <Text
        className="text-sm font-semibold"
        style={{ color: selected ? palette.onAccent : colors.label }}>
        {label}
      </Text>
    </Pressable>
  )
}
