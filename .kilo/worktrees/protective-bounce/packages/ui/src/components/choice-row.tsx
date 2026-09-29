import type { ReactElement } from 'react'
import { type ColorValue, Pressable, Text, View } from 'react-native'

import { useColors } from '../colors'
import { useUi } from '../provider'
import { Surface } from './surface'

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
  accent,
}: ChoiceRowProps): ReactElement {
  const { systemColors } = useUi()
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
        style={{
          borderRadius: 20,
          padding: 18,
          borderWidth: 2,
          borderColor: selected ? ring : 'transparent',
        }}>
        <View className="gap-1">
          <Text className="font-semibold text-base" style={{ color: colors.label }}>
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
