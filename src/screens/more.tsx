import type { ReactElement } from 'react'
import type { Href } from 'expo-router'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { strings } from '@/strings'

export interface MoreScreenProps {
  locationLabel: string
  locationHref: Href
  calculationLabel: string
  calculationHref: Href
  hijriLabel: string
  hijriHref: Href
  trackingLabel: string
  trackingHref: Href
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
}: MoreScreenProps): ReactElement {
  return (
    <Screen className="gap-3 p-4">
      <Row href={locationHref} title={strings.location.title} detail={locationLabel} />
      <Row href={calculationHref} title={strings.calculation.title} detail={calculationLabel} />
      <Row href={hijriHref} title={strings.hijri.title} detail={hijriLabel} />
      <Row href={trackingHref} title={strings.tracking.title} detail={trackingLabel} />
    </Screen>
  )
}
