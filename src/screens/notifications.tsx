import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Button } from '@/components/button'
import { ChoiceRow } from '@/components/choice-row'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { SwitchRow } from '@/components/switch-row'
import type { PermissionStatus } from '@/notifications/schedule'
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

export interface RemindableItem {
  id: string
  title: string
  on: boolean
}

export interface NotificationsScreenProps {
  preferences: NotificationPreferences
  permission: PermissionStatus
  items: RemindableItem[]
  onChange: (change: Partial<NotificationPreferences>) => void
  onToggleItem: (id: string, on: boolean) => void
  onOpenSettings: () => void
  onSendTest: () => void
}

interface SectionProps {
  title: string
  detail?: string
  children: ReactElement | (ReactElement | null)[]
}

function Section({ title, detail, children }: SectionProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
          {title}
        </Text>
        {detail ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {detail}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  )
}

function quietLabel(quiet: QuietHours | null, strings: Strings): string {
  return quiet
    ? strings.notifications.quietHoursDetail(quiet.from, quiet.to)
    : strings.notifications.quietHoursOff
}

function permissionLabel(status: PermissionStatus, strings: Strings): string {
  switch (status) {
    case 'granted':
      return strings.notifications.permissionGranted
    case 'denied':
      return strings.notifications.permissionDenied
    case 'undetermined':
      return strings.notifications.permissionUndetermined
    case 'unavailable':
      return strings.notifications.permissionUnavailable
  }
}

export function NotificationsScreen({
  preferences,
  permission,
  items,
  onChange,
  onToggleItem,
  onOpenSettings,
  onSendTest,
}: NotificationsScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-8 p-4">
      <View className="gap-3">
        <Row
          title={strings.notifications.permission}
          detail={permissionLabel(permission, strings)}
        />
        {permission === 'denied' ? (
          <Button
            title={strings.notifications.openSettings}
            onPress={onOpenSettings}
            variant="secondary"
            color={palette.accent}
          />
        ) : null}
      </View>

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

      {items.length > 0 ? (
        <Section
          title={strings.notifications.whichItems}
          detail={strings.notifications.whichItemsDetail}>
          {items.map((item) => (
            <SwitchRow
              key={item.id}
              title={item.title}
              value={item.on}
              onValueChange={(on) => onToggleItem(item.id, on)}
              accent={palette.accent}
              knob={palette.knob}
            />
          ))}
        </Section>
      ) : null}

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

      <Row
        title={strings.notifications.sendTest}
        detail={strings.notifications.sendTestDetail}
        onPress={onSendTest}
      />
    </Screen>
  )
}
