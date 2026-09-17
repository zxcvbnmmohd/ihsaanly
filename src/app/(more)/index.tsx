import { ScrollView } from 'react-native';

import { Row } from '@/components/row';
import { usePlace } from '@/location/store';
import { useCalculationPreferences } from '@/prayer/store';
import { strings } from '@/strings';

export default function More() {
  const place = usePlace();
  const calculation = useCalculationPreferences();

  return (
    <ScrollView contentContainerClassName="gap-3 p-4" contentInsetAdjustmentBehavior="automatic">
      <Row
        href="/location"
        title={strings.location.title}
        detail={place?.label ?? strings.location.notSet}
      />
      <Row
        href="/calculation"
        title={strings.calculation.title}
        detail={strings.asr[calculation.asr]}
      />
    </ScrollView>
  );
}
