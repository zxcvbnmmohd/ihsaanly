import {
  BRAND_APPEARANCES,
  type Palette,
  paletteFor,
  THEMES,
  type ThemeName,
  themes,
} from '@ihsaanly/tailwind/tokens'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useColors } from '../colors'
import { serif } from '../fonts'
import { useLayout } from '../layout'
import { appearanceName } from '../props/appearance'
import { useUi } from '../provider'
import type { ThemePreference } from '../types'
import { Ringed } from './ring'

export interface ThemePickerProps {
  value: ThemePreference
  /** Called on a tap; the host stores it and the whole app recolours at once. */
  onSelect: (preference: ThemePreference) => void
}

/** The palette a card previews: a theme's own, Light's, Dark's, or both halves for System. */
export function previewPalettes(option: ThemePreference): Palette[] {
  if (option === 'system') return [paletteFor('light'), paletteFor('dark')]
  if (option === 'light' || option === 'dark') return [paletteFor(option)]
  return [paletteFor(themes[option].scheme, option)]
}

interface CanvasProps {
  palette: Palette
}

/**
 * A theme in miniature: its wash, a card in its paper, and "Aa" in its accent
 * over an underline of it, so a card shows the whole canvas before it is chosen.
 */
function Canvas({ palette }: CanvasProps): ReactElement {
  const { strings } = useUi()
  return (
    <LinearGradient
      testID="theme-canvas"
      colors={palette.wash}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
      style={{ flex: 1, padding: 10, justifyContent: 'center' }}>
      <View
        testID="theme-card"
        className="items-center gap-1 py-2"
        style={{ backgroundColor: palette.paper, borderRadius: 12, borderCurve: 'continuous' }}>
        <Text
          aria-hidden
          importantForAccessibility="no"
          className="text-2xl"
          style={{ color: palette.accent, fontFamily: serif, fontWeight: '600' }}>
          {strings.appearance.themeSample}
        </Text>
        <View
          testID="theme-underline"
          style={{ width: 24, height: 3, borderRadius: 2, backgroundColor: palette.accent }}
        />
      </View>
    </LinearGradient>
  )
}

interface CardProps {
  option: ThemePreference
  selected: boolean
  onSelect: (option: ThemePreference) => void
}

/**
 * One option as a card: its canvas in miniature, then its name. The ring is
 * the current accent, which is the chosen option's own, drawn as a sibling
 * view so nothing covers it.
 */
function Card({ option, selected, onSelect }: CardProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const name = appearanceName(strings, option)
  const radius = { borderRadius: 18 }

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      // react-native-web reads only the aria-* form; a radio's state is aria-checked.
      aria-checked={selected}
      accessibilityLabel={name}
      onPress={() => onSelect(option)}
      style={{ flex: 1 }}>
      <View className="gap-1.5">
        <Ringed ring={selected ? colors.accent : 'transparent'} width={2.5} style={radius}>
          <View
            className="flex-row"
            style={{ ...radius, height: 92, overflow: 'hidden', borderCurve: 'continuous' }}>
            {previewPalettes(option).map((palette) => (
              <Canvas key={palette.scheme} palette={palette} />
            ))}
          </View>
        </Ringed>
        <Text
          numberOfLines={1}
          className="text-center font-medium text-sm"
          style={{ color: selected ? colors.accentInk : colors.label }}>
          {name}
        </Text>
      </View>
    </Pressable>
  )
}

interface GridProps {
  title: string
  options: readonly ThemePreference[]
  columns: number
  value: ThemePreference
  onSelect: (option: ThemePreference) => void
}

function Grid({ title, options, columns, value, onSelect }: GridProps): ReactElement {
  const colors = useColors()
  const rows = Array.from({ length: Math.ceil(options.length / columns) }, (_, row) =>
    options.slice(row * columns, (row + 1) * columns),
  )
  return (
    <View className="gap-3">
      <Text
        accessibilityRole="header"
        aria-level={2}
        className="font-semibold text-xs uppercase"
        style={{ color: colors.secondaryLabel }}>
        {title}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={title} className="gap-3">
        {rows.map((row) => (
          <View key={row.join()} className="flex-row gap-3">
            {row.map((option) => (
              <Card key={option} option={option} selected={value === option} onSelect={onSelect} />
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

/**
 * Every appearance as a grid of cards: System, Light and Dark (the brand's
 * own) three to a row, then the ten themes two to a row on a phone and five
 * wider. One preference behind both, so choosing a theme leaves System behind
 * and the other way round. Stateless, so onboarding offers the same grid with
 * a live recolour.
 */
export function ThemePicker({ value, onSelect }: ThemePickerProps): ReactElement {
  const { strings } = useUi()
  const columns = useLayout() === 'compact' ? 2 : 5

  return (
    <View className="gap-5">
      <Grid
        title={strings.appearance.modesTitle}
        options={BRAND_APPEARANCES}
        columns={3}
        value={value}
        onSelect={onSelect}
      />
      <Grid
        title={strings.appearance.themesTitle}
        options={THEMES as readonly ThemeName[]}
        columns={columns}
        value={value}
        onSelect={onSelect}
      />
    </View>
  )
}
