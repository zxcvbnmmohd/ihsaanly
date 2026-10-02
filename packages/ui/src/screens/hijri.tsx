import type { SightingAuthority } from '@ihsaanly/core/content/moon-sighting'
import { type HijriDate, offsetOptions } from '@ihsaanly/core/hijri/calendar'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { ChoiceRow } from '../components/choice-row'
import { Screen } from '../components/screen'
import { useUi } from '../provider'

export interface HijriScreenProps {
  offset: number
  preview: HijriDate | null
  authorities: SightingAuthority[]
  onChange: (offset: number) => void
}

export function HijriScreen({
  offset,
  preview,
  authorities,
  onChange,
}: HijriScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.hijri.explanation}
      </Text>

      {preview ? (
        <Text className="font-semibold text-2xl" style={{ color: colors.label }}>
          {strings.hijri.format(preview.day, strings.hijriMonth[preview.month] ?? '', preview.year)}
        </Text>
      ) : null}

      <View className="gap-3">
        <Text
          accessibilityRole="header"
          aria-level={2}
          className="font-semibold text-xs uppercase"
          style={{ color: colors.secondaryLabel }}>
          {strings.hijri.offset}
        </Text>
        {offsetOptions().map((option) => (
          <ChoiceRow
            key={option}
            title={strings.hijri.offsetLabel(option)}
            selected={offset === option}
            onPress={() => onChange(option)}
            accent={palette.accent}
          />
        ))}
      </View>

      <View className="gap-4">
        <Text
          accessibilityRole="header"
          aria-level={2}
          className="font-semibold text-xs uppercase"
          style={{ color: colors.secondaryLabel }}>
          {strings.moonSighting.title}
        </Text>
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.moonSighting.explanation}
        </Text>
        {authorities.map((authority) => (
          <View key={authority.region} className="gap-1">
            <Text className="font-semibold text-xs" style={{ color: colors.secondaryLabel }}>
              {authority.region}
            </Text>
            {authority.bodies.map((body) => (
              <Text key={body} className="text-base" style={{ color: colors.label }}>
                {body}
              </Text>
            ))}
          </View>
        ))}
        <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
          {strings.moonSighting.disclaimer}
        </Text>
      </View>
    </Screen>
  )
}
