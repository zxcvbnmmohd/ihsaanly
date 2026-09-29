import { type ReactElement, useState } from 'react'
import {
  type ColorValue,
  Pressable,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native'

import { useColors } from '../colors'
import { useUi } from '../provider'

interface Thing {
  focused: boolean
}

interface GlyphProps {
  color: ColorValue
}

/** A magnifier drawn from two views, so it follows the accent and the layout direction. */
function SearchGlyph({ color }: GlyphProps): ReactElement {
  return (
    <View style={{ width: 20, height: 20 }}>
      <View
        style={{
          position: 'absolute',
          top: 1,
          start: 1,
          width: 13,
          height: 13,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 2,
          end: 1,
          width: 8,
          height: 2.5,
          borderRadius: 2,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  )
}

interface TextFieldProps {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  /** Focus ring and glyph colour. Defaults to the system tint. */
  accent?: ColorValue
  kind?: 'search' | 'plain'
  returnKeyType?: TextInputProps['returnKeyType']
  autoCapitalize?: TextInputProps['autoCapitalize']
}

/**
 * The one text field. A quiet filled surface at rest, the accent as a ring
 * when focused, a clear control as soon as there is something to clear.
 */
export function TextField({
  value,
  onChangeText,
  placeholder,
  accent,
  kind = 'plain',
  returnKeyType,
  autoCapitalize = 'words',
}: TextFieldProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ focused: false })
  const { strings, systemColors } = useUi()
  const colors = useColors()
  const ring = accent ?? systemColors.tint

  const glyphColor = thing.focused ? ring : systemColors.secondaryLabel

  return (
    <View
      // Material's secondary background is lavender next to the warm wash.
      className="flex-row items-center gap-3 rounded-2xl ps-4 pe-3"
      style={{
        backgroundColor:
          process.env.EXPO_OS === 'android'
            ? colors.surface
            : systemColors.secondarySystemBackground,
        minHeight: 52,
        borderWidth: 1.5,
        borderColor: thing.focused ? ring : systemColors.separator,
        borderCurve: 'continuous',
      }}>
      {kind === 'search' ? <SearchGlyph color={glyphColor} /> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setThing({ focused: true })}
        onBlur={() => setThing({ focused: false })}
        placeholder={placeholder}
        placeholderTextColor={systemColors.secondaryLabel}
        autoCorrect={false}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        clearButtonMode="never"
        className="flex-1 py-3 text-base"
        style={{ color: systemColors.label }}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.textField.clear}
          hitSlop={8}
          onPress={() => onChangeText('')}
          className="items-center justify-center rounded-full"
          style={{ width: 22, height: 22, backgroundColor: systemColors.secondaryLabel }}>
          <Text
            style={{
              color: systemColors.secondarySystemBackground,
              fontSize: 11,
              fontWeight: '700',
              lineHeight: 13,
            }}>
            ✕
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
