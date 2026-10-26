import type { ReactElement, ReactNode } from 'react'
import { type ColorValue, Pressable, Text, View } from 'react-native'

import { useColors, useSystemColors } from '../colors'
import { Surface } from './surface'

interface ChoiceRowProps {
  title: string
  detail?: string | null
  selected: boolean
  onPress: () => void
  /** Ring colour when selected. Defaults to the system tint. */
  accent?: ColorValue
  /** Drawn before the title, such as a theme's swatch. */
  leading?: ReactNode
}

/** One of several, so selection is a ring around the whole row. */
export function ChoiceRow({
  title,
  detail,
  selected,
  onPress,
  accent,
  leading,
}: ChoiceRowProps): ReactElement {
  const systemColors = useSystemColors()
  const colors = useColors()
  const ring = accent ?? systemColors.tint

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      // react-native-web reads only the aria-* form; a radio's state is aria-checked.
      aria-checked={selected}
      onPress={onPress}>
      <Surface
        interactive
        ring={selected ? ring : 'transparent'}
        style={{ borderRadius: 20, padding: 18 }}>
        <View className="flex-row items-center gap-3">
          {leading}
          <View className="flex-1 gap-1">
            <Text className="font-semibold text-base" style={{ color: colors.label }}>
              {title}
            </Text>
            {detail ? (
              <Text className="text-sm leading-snug" style={{ color: colors.secondaryLabel }}>
                {detail}
              </Text>
            ) : null}
          </View>
        </View>
      </Surface>
    </Pressable>
  )
}
