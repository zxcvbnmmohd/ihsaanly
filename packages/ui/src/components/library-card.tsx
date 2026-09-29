import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useColors } from '../colors'
import { useUi } from '../provider'
import type { LibraryEntry } from '../screens/library'
import { Pill } from './pill'
import { Surface } from './surface'

export interface LibraryCardProps {
  entry: LibraryEntry
  /** Rings the card with the accent, e.g. the item open in a regular/wide reader panel. */
  selected?: boolean
  /** Overrides `entry.href`, for a host that opens the entry somewhere other than its own route. */
  href?: string
}

/**
 * One item in the Library: title, the ruling and status pills, and — when
 * the entry carries one — a line of its translation. Extracted from the
 * inline entry markup `LibraryScreen` used to render directly, so at compact
 * it still renders as exactly the row the phone always had: `selected` is
 * unset there, and an unselected card keeps the original 16px padding with
 * no border, pixel for pixel. `selected` reserves the same 2px so the card's
 * footprint does not shift when it turns on.
 */
export function LibraryCard({ entry, selected = false, href }: LibraryCardProps): ReactElement {
  const colors = useColors()
  const { scheme, strings, Link } = useUi()
  const palette = palettes[scheme]

  return (
    <Link href={href ?? entry.href} asChild>
      <Pressable accessibilityRole="link" accessibilityState={{ selected }}>
        <Surface
          interactive
          style={{
            borderRadius: 16,
            padding: selected ? 14 : 16,
            borderWidth: selected ? 2 : 0,
            borderColor: palette.accent,
          }}>
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
      </Pressable>
    </Link>
  )
}
