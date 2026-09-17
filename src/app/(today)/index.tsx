import { ScrollView } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { strings } from '@/strings';

export default function Today() {
  return (
    <ScrollView contentContainerClassName="flex-1" contentInsetAdjustmentBehavior="automatic">
      <EmptyState message={strings.today.empty} />
    </ScrollView>
  );
}
