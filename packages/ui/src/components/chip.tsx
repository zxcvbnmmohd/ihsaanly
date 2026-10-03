import type { Palette } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, Text } from 'react-native'

import { useColors } from '../colors'

interface ChipProps {
  label: string
  selected: boolean
  onPress: () => void
  palette: Palette
}

/** One of a few choices in a row; filled when it is the one in force. */
export function Chip({ label, selected, onPress, palette }: ChipProps): ReactElement {
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      // react-native-web reads only the aria-* form. A chip toggles a choice
      // on a button, so it is "pressed" (aria-selected is not valid on one).
      aria-pressed={selected}
      onPress={onPress}
      // px-3 py-2 is about 36pt tall; the slop carries it to the 44pt minimum
      // without making the pill itself look heavy in a row of them.
      hitSlop={6}
      // Material's secondary background is lavender next to the warm wash;
      // Android uses the same veil as the cards.
      className="rounded-full px-3 py-2"
      style={{
        backgroundColor: selected
          ? palette.accent
          : process.env.EXPO_OS === 'android'
            ? palette.surface
            : colors.secondarySystemBackground,
      }}>
      <Text
        className="font-semibold text-sm"
        style={{ color: selected ? palette.onAccent : colors.label }}>
        {label}
      </Text>
    </Pressable>
  )
}
