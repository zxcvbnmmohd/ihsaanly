import type { Href } from 'expo-router';
import { ScrollView } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Row } from '@/components/row';
import type { Ruling } from '@/content/schema';
import { strings } from '@/strings';

export type LibraryEntry = {
  id: string;
  title: string;
  ruling: Ruling;
  href: Href;
};

export type LibraryScreenProps = {
  entries: LibraryEntry[];
};

export function LibraryScreen({ entries }: LibraryScreenProps) {
  if (entries.length === 0) {
    return <EmptyState message={strings.library.empty} />;
  }

  return (
    <ScrollView contentContainerClassName="gap-3 p-4" contentInsetAdjustmentBehavior="automatic">
      {entries.map((entry) => (
        <Row
          key={entry.id}
          href={entry.href}
          title={entry.title}
          detail={strings.ruling[entry.ruling]}
        />
      ))}
    </ScrollView>
  );
}
