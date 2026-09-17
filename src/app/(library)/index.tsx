import { ScrollView } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { strings } from '@/strings';

export default function Library() {
  return (
    <ScrollView contentContainerClassName="flex-1" contentInsetAdjustmentBehavior="automatic">
      <EmptyState message={strings.library.empty} />
    </ScrollView>
  );
}
