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
  /** Knob colour, which Android would otherwise take from its own palette. */
  knob?: ColorValue
  /** Track colour when off. Defaults to the system separator. */
  track?: ColorValue
}

/** An on/off setting, so the control is a switch rather than a checkmark. */
export function SwitchRow({
  title,
  detail,
  value,
  onValueChange,
  accent = colors.tint,
  knob = colors.onTint,
  track = colors.separator,
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
          {/*
            The knob is light in both states, as it is on iOS, so the track is
            what carries on/off. Both are passed rather than left to Material,
            whose dynamic colours are derived from the wallpaper and gave a
            lavender knob on a lavender track — the one grey left on a warm screen.
          */}
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ true: accent, false: track }}
            thumbColor={knob}
          />
        </View>
      </Surface>
    </Pressable>
  )
}
