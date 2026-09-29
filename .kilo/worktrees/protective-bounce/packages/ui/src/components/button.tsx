import * as Haptics from 'expo-haptics'
import type { ReactElement } from 'react'
import { type ColorValue, Pressable, Text } from 'react-native'

import { useUi } from '../provider'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  /** Defaults to the system tint. Onboarding passes its own accent. */
  color?: ColorValue
  onColor?: ColorValue
  disabled?: boolean
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  color,
  onColor,
  disabled = false,
}: ButtonProps): ReactElement {
  const { systemColors } = useUi()
  const tint = color ?? systemColors.tint
  const onTint = onColor ?? systemColors.onTint

  const press = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onPress()
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={press}
        className="items-center py-3"
        style={{ opacity: disabled ? 0.45 : 1 }}>
        <Text className="font-semibold text-base" style={{ color: tint }}>
          {title}
        </Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={press}
      className="items-center rounded-full px-6 py-4"
      style={{ backgroundColor: tint, borderCurve: 'continuous', opacity: disabled ? 0.45 : 1 }}>
      <Text className="font-semibold text-base" style={{ color: onTint }}>
        {title}
      </Text>
    </Pressable>
  )
}
