import type { ReadingLayout } from '@ihsaanly/core/content/reading'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { ChoiceRow } from '../components/choice-row'
import { Screen } from '../components/screen'
import { SwitchRow } from '../components/switch-row'
import { useUi } from '../provider'
import { THEME_PREFERENCES, type ThemePreference } from '../types'

export interface AppearanceScreenProps {
  preference: ThemePreference
  onSelect: (preference: ThemePreference) => void
  /** How duas and dhikr are laid out wherever they are read. */
  reading: ReadingLayout
  onReading: (change: Partial<ReadingLayout>) => void
}

const ALIGNMENTS: readonly ReadingLayout['align'][] = ['start', 'center']

export function AppearanceScreen({
  preference,
  onSelect,
  reading,
  onReading,
}: AppearanceScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Screen palette={palette} className="gap-4 p-4">
      {THEME_PREFERENCES.map((option) => (
        <ChoiceRow
          key={option}
          title={strings.appearance[option]}
          selected={preference === option}
          onPress={() => onSelect(option)}
          accent={palette.accent}
        />
      ))}

      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.appearance.note}
      </Text>

      <View className="gap-3 pt-4">
        <Text
          accessibilityRole="header"
          aria-level={2}
          className="font-semibold text-xs uppercase"
          style={{ color: colors.secondaryLabel }}>
          {strings.appearance.reading}
        </Text>
        <SwitchRow
          title={strings.appearance.arabicFirst}
          detail={strings.appearance.arabicFirstDetail}
          value={reading.arabicFirst}
          onValueChange={(arabicFirst) => onReading({ arabicFirst })}
          accent={palette.accent}
          knob={palette.knob}
          track={palette.wash[1]}
        />
        <Text className="pt-2 font-semibold text-sm" style={{ color: colors.label }}>
          {strings.appearance.alignment}
        </Text>
        {ALIGNMENTS.map((align) => (
          <ChoiceRow
            key={align}
            title={
              align === 'start' ? strings.appearance.alignStart : strings.appearance.alignCenter
            }
            selected={reading.align === align}
            onPress={() => onReading({ align })}
            accent={palette.accent}
          />
        ))}
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.appearance.readingNote}
        </Text>
      </View>
    </Screen>
  )
}
