import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useColors } from '../colors'
import { useUi } from '../provider'
import { Surface } from './surface'
import { type WebPressableState, webInteractiveStyle } from './surface.web'

interface RowProps {
  title: string
  detail?: string | null
  href?: string
  onPress?: () => void
  selected?: boolean
}

/**
 * The web twin of `row.tsx`, following the `surface.web.tsx` precedent so
 * the hover tint and focus ring live only here rather than behind a
 * `Platform.OS` check the native file would otherwise carry. Metro never
 * resolves this file, so native rendering is exactly `row.tsx`, unchanged.
 */
export function Row({ title, detail, href, onPress, selected }: RowProps): ReactElement {
  const { strings, Link } = useUi()
  const colors = useColors()

  function body(state?: WebPressableState): ReactElement {
    return (
      <Surface
        interactive
        style={[
          { borderRadius: 16, padding: 16 },
          state ? webInteractiveStyle(state, colors) : null,
        ]}>
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
  }

  // Same rationale as row.tsx: no href and no handler is a display line, not
  // a control, so it renders with no Pressable and therefore no hover state.
  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable accessibilityRole="link" accessibilityState={{ selected }}>
          {(state: WebPressableState) => body(state)}
        </Pressable>
      </Link>
    )
  }

  if (!onPress) return body()

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}>
      {(state: WebPressableState) => body(state)}
    </Pressable>
  )
}
