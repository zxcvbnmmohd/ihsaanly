import type { ReactElement, ReactNode } from 'react'
import { Text, useColorScheme, View } from 'react-native'
import type { Href } from 'expo-router'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { Wash } from '@/components/wash'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { usePalette } from '@/theme/store'

export interface MoreScreenProps {
  locationLabel: string
  locationHref: Href
  calculationLabel: string
  calculationHref: Href
  hijriLabel: string
  hijriHref: Href
  trackingLabel: string
  trackingHref: Href
  moonSightingHref: Href
  notificationsHref: Href
  eventsHref: Href
  historyHref: Href
  dataHref: Href
  languageHref: Href
  languageLabel: string
  appearanceHref: Href
  appearanceLabel: string
}

export function MoreScreen({
  locationLabel,
  locationHref,
  calculationLabel,
  calculationHref,
  hijriLabel,
  hijriHref,
  trackingLabel,
  trackingHref,
  moonSightingHref,
  notificationsHref,
  eventsHref,
  historyHref,
  dataHref,
  languageHref,
  languageLabel,
  appearanceHref,
  appearanceLabel,
}: MoreScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <View className="flex-1" style={{ backgroundColor: colors.systemBackground }}>
      <Wash palette={palette} />
      <Screen className="gap-6 p-4">
        <Group title={strings.more.prayer} accent={palette.accent}>
          <Row href={locationHref} title={strings.location.title} detail={locationLabel} />
          <Row href={calculationHref} title={strings.calculation.title} detail={calculationLabel} />
          <Row href={hijriHref} title={strings.hijri.title} detail={hijriLabel} />
          <Row href={moonSightingHref} title={strings.moonSighting.title} detail={null} />
        </Group>

        <Group title={strings.more.app} accent={palette.accent}>
          <Row href={notificationsHref} title={strings.notifications.title} detail={null} />
          <Row href={trackingHref} title={strings.tracking.title} detail={trackingLabel} />
          <Row href={eventsHref} title={strings.events.title} detail={null} />
          <Row href={languageHref} title={strings.language.title} detail={languageLabel} />
          <Row href={appearanceHref} title={strings.appearance.title} detail={appearanceLabel} />
        </Group>

        <Group title={strings.more.practice} accent={palette.accent}>
          <Row href={historyHref} title={strings.history.title} detail={null} />
          <Row href={dataHref} title={strings.data.title} detail={null} />
        </Group>
      </Screen>
    </View>
  )
}

interface GroupProps {
  title: string
  accent: string
  children: ReactNode
}

function Group({ title, accent, children }: GroupProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-3">
      <Text className="text-xs font-semibold tracking-wide uppercase" style={{ color: accent }}>
        {title}
      </Text>
      {children}
    </View>
  )
}
