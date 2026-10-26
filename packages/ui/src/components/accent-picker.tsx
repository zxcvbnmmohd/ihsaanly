import { ACCENTS, type AccentName, paletteFor } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useColors } from '../colors'
import { serif } from '../fonts'
import { useLayout } from '../layout'
import { useUi } from '../provider'
import { Surface } from './surface'

export interface AccentPickerProps {
  value: AccentName
  /** Called on a tap; the host stores it and the whole app recolours at once. */
  onSelect: (accent: AccentName) => void
}

interface SwatchProps {
  accent: AccentName
  selected: boolean
  onSelect: (accent: AccentName) => void
}

/**
 * One accent as a card: a sample of the script in the accent, an underline in
 * it and its name. Each card shows its own accent for the scheme being
 * rendered, so the grid previews every choice before it is made. The ring is
 * the chosen accent's, drawn through `Surface` because liquid glass covers a
 * border of its own.
 */
function Swatch({ accent, selected, onSelect }: SwatchProps): ReactElement {
  const { strings, scheme } = useUi()
  const colors = useColors()
  const own = paletteFor(scheme, accent).accent

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      // react-native-web reads only the aria-* form; a radio's state is aria-checked.
      aria-checked={selected}
      accessibilityLabel={strings.appearance.accents[accent]}
      onPress={() => onSelect(accent)}
      style={{ flex: 1 }}>
      <Surface
        interactive
        ring={selected ? own : 'transparent'}
        style={{ borderRadius: 20, paddingVertical: 14, paddingHorizontal: 12 }}>
        <View className="items-center gap-1.5">
          <Text
            aria-hidden
            importantForAccessibility="no"
            className="text-3xl"
            style={{ color: own, fontFamily: serif, fontWeight: '600' }}>
            {strings.appearance.accentSample}
          </Text>
          <View
            testID="accent-underline"
            style={{ width: 28, height: 3, borderRadius: 2, backgroundColor: own }}
          />
          <Text numberOfLines={1} className="font-medium text-sm" style={{ color: colors.label }}>
            {strings.appearance.accents[accent]}
          </Text>
        </View>
      </Surface>
    </Pressable>
  )
}

/** Two columns on a phone, five on anything wider: both divide the ten accents evenly. */
function rowsOf(columns: number): AccentName[][] {
  return Array.from({ length: Math.ceil(ACCENTS.length / columns) }, (_, row) =>
    ACCENTS.slice(row * columns, (row + 1) * columns),
  )
}

/**
 * The accents as a grid of swatch cards, the chosen one ringed. Stateless and
 * screen-agnostic, so onboarding can offer the same choice with a live
 * recolour.
 */
export function AccentPicker({ value, onSelect }: AccentPickerProps): ReactElement {
  const { strings } = useUi()
  const columns = useLayout() === 'compact' ? 2 : 5

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={strings.appearance.accentTitle}
      className="gap-3">
      {rowsOf(columns).map((row) => (
        <View key={row.join()} className="flex-row gap-3">
          {row.map((accent) => (
            <Swatch key={accent} accent={accent} selected={value === accent} onSelect={onSelect} />
          ))}
        </View>
      ))}
    </View>
  )
}
