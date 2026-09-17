import type { ReactElement } from 'react';
import { items, resolveText } from '@/content';
import { LibraryScreen, type LibraryEntry } from '@/screens/library';

export default function LibraryRoute(): ReactElement {
  const entries: LibraryEntry[] = items.map((item) => ({
    id: item.id,
    title: resolveText(item.title) ?? item.id,
    ruling: item.ruling,
    href: `/item/${item.id}`,
  }));

  return <LibraryScreen entries={entries} />;
}
