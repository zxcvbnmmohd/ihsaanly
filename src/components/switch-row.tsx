import type { ReactElement } from 'react'
import { Pressable, Switch, Text, useColorScheme, View, type ColorValue } from 'react-native'

import { Surface } from '@/components/surface'
import { colors } from '@/theme/colors'

interface SwitchRowProps {
  title: string
  detail?: string | null
  value: boolean
  onValueChange: (value: boolean) => void
  /** Track colour when on. Defaults to the system tint. */
  accent?: ColorValue
  /** Knob colour when on, which Android would otherwise take from its own palette. */
  knob?: ColorValue
}

/** An on/off setting, so the control is a switch rather than a checkmark. */
export function SwitchRow({
  title,
  detail,
  value,
  onValueChange,
  accent = colors.tint,
  knob = colors.onTint,
}: SwitchRowProps): ReactElement {
  useColorScheme()

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      onPress={() => onValueChange(!value)}>
      <Surface interactive style={{ borderRadius: 18, padding: 16 }}>
        <View className="flex-row items-center gap-4">
          <View className="flex-1 gap-1">
            <Text className="text-base font-semibold" style={{ color: colors.label }}>
              {title}
            </Text>
            {detail ? (
              <Text className="text-sm leading-snug" style={{ color: colors.secondaryLabel }}>
                {detail}
              </Text>
            ) : null}
          </View>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ true: accent, false: colors.separator }}
            thumbColor={value ? knob : undefined}
          />
        </View>
      </Surface>
    </Pressable>
  )
}
