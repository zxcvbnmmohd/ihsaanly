import type { ReactElement } from 'react';
import type { Href } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { Row } from '@/components/row';
import { Screen } from '@/components/screen';
import type { Ruling } from '@/content/schema';
import { strings } from '@/strings';

export interface LibraryEntry {
  id: string;
  title: string;
  ruling: Ruling;
  href: Href;
}

export interface LibraryScreenProps {
  entries: LibraryEntry[];
}

export function LibraryScreen({ entries }: LibraryScreenProps): ReactElement {
  if (entries.length === 0) {
    return <EmptyState message={strings.library.empty} />;
  }

  return (
    <Screen className="gap-3 p-4">
      {entries.map((entry) => (
        <Row
          key={entry.id}
          href={entry.href}
          title={entry.title}
          detail={strings.ruling[entry.ruling]}
        />
      ))}
    </Screen>
  );
}
