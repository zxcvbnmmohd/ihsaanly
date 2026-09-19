import type { ReactElement } from 'react'
import type { Href } from 'expo-router'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { useStrings } from '@/strings'

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
  return (
    <Screen className="gap-3 p-4">
      <Row href={locationHref} title={strings.location.title} detail={locationLabel} />
      <Row href={calculationHref} title={strings.calculation.title} detail={calculationLabel} />
      <Row href={hijriHref} title={strings.hijri.title} detail={hijriLabel} />
      <Row href={notificationsHref} title={strings.notifications.title} detail={null} />
      <Row href={trackingHref} title={strings.tracking.title} detail={trackingLabel} />
      <Row href={eventsHref} title={strings.events.title} detail={null} />
      <Row href={historyHref} title={strings.history.title} detail={null} />
      <Row href={languageHref} title={strings.language.title} detail={languageLabel} />
      <Row href={appearanceHref} title={strings.appearance.title} detail={appearanceLabel} />
      <Row href={dataHref} title={strings.data.title} detail={null} />
      <Row href={moonSightingHref} title={strings.moonSighting.title} detail={null} />
    </Screen>
  )
}
