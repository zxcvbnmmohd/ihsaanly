import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { NotificationPreferences, QuietHours } from '@/plan/notification-preferences'
import { strings } from '@/strings'
import { colors } from '@/theme/colors'

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

function quietLabel(quiet: QuietHours | null): string {
  return quiet
    ? strings.notifications.quietHoursDetail(quiet.from, quiet.to)
    : strings.notifications.quietHoursOff
}

export function NotificationsScreen({
  preferences,
  onChange,
}: NotificationsScreenProps): ReactElement {
  useColorScheme()

  return (
    <Screen className="gap-8 p-4">
      <View className="gap-3">
        <Row
          title={strings.notifications.windows}
          selected={preferences.windows}
          onPress={() => onChange({ windows: !preferences.windows })}
        />
        <Row
          title={strings.notifications.lookAhead}
          selected={preferences.lookAhead}
          onPress={() => onChange({ lookAhead: !preferences.lookAhead })}
        />
        <Row
          title={strings.notifications.prayers}
          detail={strings.notifications.prayersDetail}
          selected={preferences.prayers}
          onPress={() => onChange({ prayers: !preferences.prayers })}
        />
      </View>

      <Section title={strings.notifications.quietHours}>
        {QUIET_HOUR_PRESETS.map((preset) => (
          <Row
            key={quietLabel(preset)}
            title={quietLabel(preset)}
            selected={quietLabel(preferences.quietHours) === quietLabel(preset)}
            onPress={() => onChange({ quietHours: preset })}
          />
        ))}
      </Section>

      <Section title={strings.notifications.perDay}>
        {PER_DAY_OPTIONS.map((count) => (
          <Row
            key={count}
            title={String(count)}
            selected={preferences.maxPerDay === count}
            onPress={() => onChange({ maxPerDay: count })}
          />
        ))}
      </Section>
    </Screen>
  )
}
