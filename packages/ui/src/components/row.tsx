import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { useUi } from '../provider'

import { Surface } from './surface'

interface RowProps {
  title: string
  detail?: string | null
  href?: string
  onPress?: () => void
  selected?: boolean
}

export function Row({ title, detail, href, onPress, selected }: RowProps): ReactElement {
  const { strings, Link } = useUi()
  const colors = useColors()

  const body = (
    <Surface interactive style={{ borderRadius: 16, padding: 16 }}>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-1">
          <Text className="font-semibold text-base" style={{ color: colors.label }}>
            {title}
          </Text>
          {detail ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {detail}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <Text
            className="text-base"
            style={{ color: colors.systemTint }}
            accessibilityLabel={strings.calculation.selected}>
            ✓
          </Text>
        ) : null}
      </View>
    </Surface>
  )

  // Without a role a screen reader reads the text and gives no hint that it does
  // anything, which matters here more than anywhere: this is the row the whole
  // app is built from. A row with neither destination nor handler is a plain
  // display line, so it stays one rather than pretending to be a button.
  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable accessibilityRole="link" accessibilityState={{ selected }}>
          {body}
        </Pressable>
      </Link>
    )
  }

  if (!onPress) return body

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}>
      {body}
    </Pressable>
  )
}
