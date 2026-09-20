import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Screen } from '@/components/screen'
import { SwitchRow } from '@/components/switch-row'
import { ChoiceRow } from '@/components/choice-row'
import type { NotificationPreferences, QuietHours } from '@/plan/notification-preferences'
import { useStrings, type Strings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export const QUIET_HOUR_PRESETS: (QuietHours | null)[] = [
  null,
  { from: 21, to: 6 },
  { from: 22, to: 7 },
  { from: 23, to: 6 },
]

export const PER_DAY_OPTIONS = [1, 2, 3, 5]

export interface NotificationsScreenProps {
  preferences: NotificationPreferences
  onChange: (change: Partial<NotificationPreferences>) => void
}

function Section({ title, children }: { title: string; children: ReactElement[] }): ReactElement {
  useColorScheme()

  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
        {title}
      </Text>
      {children}
    </View>
  )
}

function quietLabel(quiet: QuietHours | null, strings: Strings): string {
  return quiet
    ? strings.notifications.quietHoursDetail(quiet.from, quiet.to)
    : strings.notifications.quietHoursOff
}

export function NotificationsScreen({
  preferences,
  onChange,
}: NotificationsScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen className="gap-8 p-4">
      <View className="gap-3">
        <SwitchRow
          title={strings.notifications.windows}
          value={preferences.windows}
          onValueChange={(windows) => onChange({ windows })}
          accent={palette.accent}
          knob={palette.knob}
        />
        <SwitchRow
          title={strings.notifications.lookAhead}
          value={preferences.lookAhead}
          onValueChange={(lookAhead) => onChange({ lookAhead })}
          accent={palette.accent}
          knob={palette.knob}
        />
        <SwitchRow
          title={strings.notifications.prayers}
          detail={strings.notifications.prayersDetail}
          value={preferences.prayers}
          onValueChange={(prayers) => onChange({ prayers })}
          accent={palette.accent}
          knob={palette.knob}
        />
      </View>

      <Section title={strings.notifications.quietHours}>
        {QUIET_HOUR_PRESETS.map((preset) => (
          <ChoiceRow
            key={quietLabel(preset, strings)}
            title={quietLabel(preset, strings)}
            selected={quietLabel(preferences.quietHours, strings) === quietLabel(preset, strings)}
            accent={palette.accent}
            onPress={() => onChange({ quietHours: preset })}
          />
        ))}
      </Section>

      <Section title={strings.notifications.perDay}>
        {PER_DAY_OPTIONS.map((count) => (
          <ChoiceRow
            key={count}
            title={String(count)}
            selected={preferences.maxPerDay === count}
            accent={palette.accent}
            onPress={() => onChange({ maxPerDay: count })}
          />
        ))}
      </Section>
    </Screen>
  )
}
