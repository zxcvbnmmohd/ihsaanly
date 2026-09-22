import type { Href } from 'expo-router'
import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { SwitchRow } from '@/components/switch-row'
import type { EventSettings } from '@/events/store'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

/** The moments no sensor can find. Raised by hand, cleared by hand. */
export const MANUAL_EVENTS = ['ascending', 'descending', 'driving', 'travel'] as const

export interface EventsScreenProps {
  settings: EventSettings
  /** False when no place is set, so there is nothing to call home yet. */
  canSetHome: boolean
  locationHref: Href
  onToggleDetectHome: () => void
  onSetHome: () => void
  onToggleManual: (event: string) => void
}

export function EventsScreen({
  settings,
  canSetHome,
  locationHref,
  onToggleDetectHome,
  onSetHome,
  onToggleManual,
}: EventsScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  // On with nowhere to watch does nothing at all, and said nothing about it.
  const watchingNothing = settings.detectHome && !settings.home

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.events.explanation}
      </Text>

      <View className="gap-3">
        <SwitchRow
          title={strings.events.detectHome}
          detail={strings.events.detectHomeDetail}
          value={settings.detectHome}
          onValueChange={onToggleDetectHome}
          accent={palette.accent}
          knob={palette.knob}
        />
        {watchingNothing ? (
          <Text className="px-1 text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.events.homeNeeded}
          </Text>
        ) : null}
        {canSetHome ? (
          <Row
            title={strings.events.setHome}
            detail={settings.home?.label ?? strings.events.homeUnset}
            onPress={onSetHome}
          />
        ) : (
          <Row
            href={locationHref}
            title={strings.events.setHome}
            detail={strings.events.noPlaceYet}
          />
        )}
      </View>

      <View className="gap-3">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
          {strings.events.manual}
        </Text>
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {strings.events.manualDetail}
        </Text>
        {MANUAL_EVENTS.map((event) => (
          <SwitchRow
            key={event}
            title={strings.event[event] ?? event}
            value={settings.manual.includes(event)}
            onValueChange={() => onToggleManual(event)}
            accent={palette.accent}
            knob={palette.knob}
          />
        ))}
      </View>
    </Screen>
  )
}
