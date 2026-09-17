import type { Href } from 'expo-router'
import type { ReactElement, ReactNode } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { HijriDate } from '@/hijri/calendar'
import type { Prayer } from '@/prayer/qada'
import type { WindowName } from '@/prayer/windows'
import { strings } from '@/strings'
import { colors } from '@/theme/colors'

export interface TodayEntry {
  id: string
  title: string
  detail: string | null
  href: Href
}

export interface PrayerEntry {
  prayer: Prayer
  done: boolean
}

export interface QadaEntry {
  prayer: Prayer
  count: number
}

export interface TodayScreenProps {
  hasLocation: boolean
  window: WindowName | null
  hijri: HijriDate | null
  rightNow: TodayEntry | null
  context: TodayEntry[]
  comingUp: TodayEntry[]
  prayers: PrayerEntry[]
  qada: QadaEntry[]
  onMarkPrayer: (prayer: Prayer) => void
  onMakeUp: (prayer: Prayer) => void
  locationHref: Href
}

function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
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

export function TodayScreen({
  hasLocation,
  window,
  hijri,
  rightNow,
  context,
  comingUp,
  prayers,
  qada,
  onMarkPrayer,
  onMakeUp,
  locationHref,
}: TodayScreenProps): ReactElement {
  useColorScheme()

  if (!hasLocation) {
    return (
      <Screen>
        <Text className="text-base" style={{ color: colors.secondaryLabel }}>
          {strings.today.needsLocation}
        </Text>
        <Row href={locationHref} title={strings.location.title} detail={strings.location.notSet} />
      </Screen>
    )
  }

  return (
    <Screen className="gap-6 p-4">
      <View className="gap-1">
        <Text className="text-3xl font-semibold" style={{ color: colors.label }}>
          {window ? strings.window[window] : strings.today.title}
        </Text>
        {hijri ? (
          <Text className="text-base" style={{ color: colors.secondaryLabel }}>
            {strings.hijri.format(hijri.day, strings.hijriMonth[hijri.month] ?? '', hijri.year)}
          </Text>
        ) : null}
      </View>

      {rightNow ? (
        <Section title={strings.plan.rightNow}>
          <Row href={rightNow.href} title={rightNow.title} detail={rightNow.detail} />
        </Section>
      ) : null}

      {context.length > 0 ? (
        <Section title={strings.plan.context}>
          {context.map((entry) => (
            <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
          ))}
        </Section>
      ) : null}

      {prayers.length > 0 ? (
        <Section title={strings.plan.prayers}>
          {prayers.map((entry) => (
            <Row
              key={entry.prayer}
              title={strings.prayer[entry.prayer]}
              detail={entry.done ? strings.plan.prayed : null}
              selected={entry.done}
              onPress={() => onMarkPrayer(entry.prayer)}
            />
          ))}
        </Section>
      ) : null}

      {qada.length > 0 ? (
        <Section title={strings.plan.makeUp}>
          {qada.map((entry) => (
            <Row
              key={entry.prayer}
              title={strings.prayer[entry.prayer]}
              detail={strings.plan.outstanding(entry.count)}
              onPress={() => onMakeUp(entry.prayer)}
            />
          ))}
        </Section>
      ) : null}

      {comingUp.length > 0 ? (
        <Section title={strings.plan.comingUp}>
          {comingUp.map((entry) => (
            <Row key={entry.id} href={entry.href} title={entry.title} detail={entry.detail} />
          ))}
        </Section>
      ) : null}

      <Text className="text-xs" style={{ color: colors.secondaryLabel }}>
        {strings.hijri.approximate}
      </Text>
    </Screen>
  )
}
