import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { EventSettings } from '@/events/store'
import { strings } from '@/strings'
import { colors } from '@/theme/colors'

/** The moments no sensor can find. Raised by hand, cleared by hand. */
export const MANUAL_EVENTS = ['ascending', 'descending', 'driving', 'travel'] as const

export interface EventsScreenProps {
  settings: EventSettings
  onToggleDetectHome: () => void
  onSetHome: () => void
  onToggleManual: (event: string) => void
}

export function EventsScreen({
  settings,
  onToggleDetectHome,
  onSetHome,
  onToggleManual,
}: EventsScreenProps): ReactElement {
  useColorScheme()

  return (
    <Screen className="gap-6 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.events.explanation}
      </Text>

      <View className="gap-3">
        <Row
          title={strings.events.detectHome}
          detail={strings.events.detectHomeDetail}
          selected={settings.detectHome}
          onPress={onToggleDetectHome}
        />
        <Row
          title={strings.events.setHome}
          detail={settings.home?.label ?? strings.events.homeUnset}
          onPress={onSetHome}
        />
      </View>

      <View className="gap-3">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
          {strings.events.manual}
        </Text>
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.events.manualDetail}
        </Text>
        {MANUAL_EVENTS.map((event) => (
          <Row
            key={event}
            title={strings.event[event] ?? event}
            selected={settings.manual.includes(event)}
            onPress={() => onToggleManual(event)}
          />
        ))}
      </View>
    </Screen>
  )
}
