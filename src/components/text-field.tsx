import { useState, type ReactElement } from 'react'
import {
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
  type ColorValue,
  type TextInputProps,
} from 'react-native'

import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

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
  accent = colors.tint,
  kind = 'plain',
  returnKeyType,
  autoCapitalize = 'words',
}: TextFieldProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ focused: false })
  const strings = useStrings()
  useColorScheme()
  const palette = usePalette()
  // Material's secondary background is lavender next to the warm wash.
  const fill =
    process.env.EXPO_OS === 'android' ? palette.surface : colors.secondarySystemBackground

  const glyphColor = thing.focused ? accent : colors.secondaryLabel

  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl ps-4 pe-3"
      style={{
        minHeight: 52,
        backgroundColor: fill,
        borderWidth: 1.5,
        borderColor: thing.focused ? accent : colors.separator,
        borderCurve: 'continuous',
      }}>
      {kind === 'search' ? <SearchGlyph color={glyphColor} /> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setThing({ focused: true })}
        onBlur={() => setThing({ focused: false })}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryLabel}
        autoCorrect={false}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        clearButtonMode="never"
        className="flex-1 py-3 text-base"
        style={{ color: colors.label }}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.textField.clear}
          hitSlop={8}
          onPress={() => onChangeText('')}
          className="items-center justify-center rounded-full"
          style={{ width: 22, height: 22, backgroundColor: colors.secondaryLabel }}>
          <Text
            style={{
              color: colors.secondarySystemBackground,
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
