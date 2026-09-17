import { ScrollView } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Row } from '@/components/row';
import { items, resolveText } from '@/content';
import { strings } from '@/strings';

export default function Library() {
  if (items.length === 0) {
    return <EmptyState message={strings.library.empty} />;
  }

  return (
    <ScrollView contentContainerClassName="gap-3 p-4" contentInsetAdjustmentBehavior="automatic">
      {items.map((item) => (
        <Row
          key={item.id}
          href={`/item/${item.id}`}
          title={resolveText(item.title) ?? item.id}
          detail={strings.ruling[item.ruling]}
        />
      ))}
    </ScrollView>
  );
}
