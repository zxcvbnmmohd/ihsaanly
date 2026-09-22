import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { ChoiceRow } from '@/components/choice-row'
import { Screen } from '@/components/screen'
import type { SightingAuthority } from '@/content/moon-sighting'
import { offsetOptions, type HijriDate } from '@/hijri/calendar'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

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
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.hijri.explanation}
      </Text>

      {preview ? (
        <Text className="text-2xl font-semibold" style={{ color: colors.label }}>
          {strings.hijri.format(preview.day, strings.hijriMonth[preview.month] ?? '', preview.year)}
        </Text>
      ) : null}

      <View className="gap-3">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
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
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
          {strings.moonSighting.title}
        </Text>
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.moonSighting.explanation}
        </Text>
        {authorities.map((authority) => (
          <View key={authority.region} className="gap-1">
            <Text className="text-xs font-semibold" style={{ color: colors.secondaryLabel }}>
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
