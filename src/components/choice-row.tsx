import type { ReactElement } from 'react'
import { Pressable, Text, useColorScheme, View, type ColorValue } from 'react-native'

import { Surface } from '@/components/surface'
import { colors } from '@/theme/colors'

interface ChoiceRowProps {
  title: string
  detail?: string | null
  selected: boolean
  onPress: () => void
  /** Ring colour when selected. Defaults to the system tint. */
  accent?: ColorValue
}

/** One of several, so selection is a ring around the whole row. */
export function ChoiceRow({
  title,
  detail,
  selected,
  onPress,
  accent = colors.tint,
}: ChoiceRowProps): ReactElement {
  useColorScheme()

  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}>
      <Surface
        interactive
        style={{
          borderRadius: 20,
          padding: 18,
          borderWidth: 2,
          borderColor: selected ? accent : 'transparent',
        }}>
        <View className="gap-1">
          <Text className="text-base font-semibold" style={{ color: colors.label }}>
            {title}
          </Text>
          {detail ? (
            <Text className="text-sm leading-snug" style={{ color: colors.secondaryLabel }}>
              {detail}
            </Text>
          ) : null}
        </View>
      </Surface>
    </Pressable>
  )
}
