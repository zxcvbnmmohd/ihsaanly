import type { ReactElement } from 'react'
import { type ColorValue, Pressable, Switch, Text, View } from 'react-native'

import { useColors } from '../colors'
import { useUi } from '../provider'
import { Surface } from './surface'

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
  accent,
  knob,
  track,
}: SwitchRowProps): ReactElement {
  const { systemColors } = useUi()
  const colors = useColors()
  const trackOn = accent ?? systemColors.tint
  const knobColor = knob ?? systemColors.onTint
  const trackOff = track ?? systemColors.separator

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      // react-native-web reads only the aria-* form.
      aria-checked={value}
      accessibilityLabel={title}
      onPress={() => onValueChange(!value)}>
      <Surface interactive style={{ borderRadius: 18, padding: 16 }}>
        <View className="flex-row items-center gap-4">
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
          {/*
            The knob is light in both states, as it is on iOS, so the track is
            what carries on/off. Both are passed rather than left to Material,
            whose dynamic colours are derived from the wallpaper and gave a
            lavender knob on a lavender track — the one grey left on a warm screen.
          */}
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ true: trackOn, false: trackOff }}
            thumbColor={knobColor}
          />
        </View>
      </Surface>
    </Pressable>
  )
}
