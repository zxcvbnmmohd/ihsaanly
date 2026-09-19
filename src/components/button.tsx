import type { ReactElement } from 'react'
import * as Haptics from 'expo-haptics'
import { Pressable, Text, useColorScheme, type ColorValue } from 'react-native'

import { colors } from '@/theme/colors'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  /** Defaults to the system tint. Onboarding passes its own accent. */
  color?: ColorValue
  onColor?: ColorValue
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  color = colors.tint,
  onColor = colors.onTint,
}: ButtonProps): ReactElement {
  useColorScheme()

  const press = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  if (variant === 'secondary') {
    return (
      <Pressable accessibilityRole="button" onPress={press} className="items-center py-3">
        <Text className="text-base font-semibold" style={{ color }}>
          {title}
        </Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={press}
      className="items-center rounded-full px-6 py-4"
      style={{ backgroundColor: color, borderCurve: 'continuous' }}>
      <Text className="text-base font-semibold" style={{ color: onColor }}>
        {title}
      </Text>
    </Pressable>
  )
}
