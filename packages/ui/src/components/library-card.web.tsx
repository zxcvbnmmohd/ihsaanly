import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useColors } from '../colors'
import { useUi } from '../provider'
import type { LibraryEntry } from '../screens/library'
import { Pill } from './pill'
import { Surface } from './surface'
import { type WebPressableState, webInteractiveStyle } from './surface.web'

export interface LibraryCardProps {
  entry: LibraryEntry
  selected?: boolean
  href?: string
}

/**
 * The web twin of `library-card.tsx`, following `row.web.tsx`: the hover
 * tint and focus ring live only here, behind the react-native-web
 * `Pressable` render-prop state, so Metro never resolves this file and the
 * native card stays exactly `library-card.tsx`.
 */
export function LibraryCard({ entry, selected = false, href }: LibraryCardProps): ReactElement {
  const colors = useColors()
  const { scheme, strings, Link } = useUi()
  const palette = palettes[scheme]

  function body(state?: WebPressableState): ReactElement {
    return (
      <Surface
        interactive
        style={[
          {
            borderRadius: 16,
            padding: selected ? 14 : 16,
            borderWidth: selected ? 2 : 0,
            borderColor: palette.accent,
          },
          state ? webInteractiveStyle(state, colors) : null,
        ]}>
        <View className="gap-2">
          <Text className="font-semibold text-base" style={{ color: colors.label }}>
            {entry.title}
          </Text>
          {entry.subtitle ? (
            <Text className="text-sm" numberOfLines={1} style={{ color: colors.secondaryLabel }}>
              {entry.subtitle}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-1.5">
            <Pill
              label={strings.ruling[entry.ruling]}
              emphasis={entry.ruling === 'fard' || entry.ruling === 'wajib'}
              accent={palette.accent}
              onAccent={palette.onAccent}
            />
            {entry.onToday ? (
              <Pill
                label={strings.library.onToday}
                emphasis
                accent={palette.accent}
                onAccent={palette.onAccent}
              />
            ) : null}
            {entry.known ? (
              <Pill
                label={strings.library.known}
                accent={palette.accent}
                onAccent={palette.onAccent}
              />
            ) : null}
          </View>
        </View>
      </Surface>
    )
  }

  return (
    <Link href={href ?? entry.href} asChild>
      <Pressable accessibilityRole="link" accessibilityState={{ selected }}>
        {(state: WebPressableState) => body(state)}
      </Pressable>
    </Link>
  )
}
