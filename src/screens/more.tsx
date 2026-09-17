import type { Href } from 'expo-router';
import { ScrollView } from 'react-native';

import { Row } from '@/components/row';
import { strings } from '@/strings';

export type MoreScreenProps = {
  locationLabel: string;
  locationHref: Href;
  calculationLabel: string;
  calculationHref: Href;
};

export function MoreScreen({
  locationLabel,
  locationHref,
  calculationLabel,
  calculationHref,
}: MoreScreenProps) {
  return (
    <ScrollView contentContainerClassName="gap-3 p-4" contentInsetAdjustmentBehavior="automatic">
      <Row href={locationHref} title={strings.location.title} detail={locationLabel} />
      <Row href={calculationHref} title={strings.calculation.title} detail={calculationLabel} />
    </ScrollView>
  );
}
