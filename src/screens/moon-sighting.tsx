import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Screen } from '@/components/screen'
import type { SightingAuthority } from '@/content/moon-sighting'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'

export interface MoonSightingScreenProps {
  authorities: SightingAuthority[]
}

export function MoonSightingScreen({ authorities }: MoonSightingScreenProps): ReactElement {
  const strings = useStrings()
  useColorScheme()

  return (
    <Screen className="gap-6 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.moonSighting.explanation}
      </Text>

      {authorities.map((authority) => (
        <View key={authority.region} className="gap-1">
          <Text
            className="text-xs font-semibold uppercase"
            style={{ color: colors.secondaryLabel }}>
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
    </Screen>
  )
}
