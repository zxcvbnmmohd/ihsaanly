import type { Href } from 'expo-router';

import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import { strings } from '@/strings';

export type MoreScreenProps = {
  locationLabel: string;
  locationHref: Href;
  calculationLabel: string;
  calculationHref: Href;
  hijriLabel: string;
  hijriHref: Href;
};

export function MoreScreen({
  locationLabel,
  locationHref,
  calculationLabel,
  calculationHref,
  hijriLabel,
  hijriHref,
}: MoreScreenProps) {
  return (
    <Screen className="gap-3 p-4">
      <Row href={locationHref} title={strings.location.title} detail={locationLabel} />
      <Row href={calculationHref} title={strings.calculation.title} detail={calculationLabel} />
      <Row href={hijriHref} title={strings.hijri.title} detail={hijriLabel} />
    </Screen>
  );
}
