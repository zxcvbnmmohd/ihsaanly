import { ScrollView } from 'react-native';

import { Row } from '@/components/row';
import { usePlace } from '@/location/store';
import { strings } from '@/strings';

export default function More() {
  const place = usePlace();

  return (
    <ScrollView contentContainerClassName="gap-3 p-4" contentInsetAdjustmentBehavior="automatic">
      <Row
        href="/location"
        title={strings.location.title}
        detail={place?.label ?? strings.location.notSet}
      />
    </ScrollView>
  );
}
