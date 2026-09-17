import type { ReactElement } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';

import { itemById, resolveText } from '@/content';
import { ItemScreen } from '@/screens/item';
import { strings } from '@/strings';

export default function ItemRoute(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = itemById(id);
  const title = item ? resolveText(item.title) : null;

  return (
    <>
      <Stack.Screen options={{ title: title ?? strings.notFound.title }} />
      <ItemScreen
        item={
          item
            ? {
                ruling: item.ruling,
                repeat: item.repeat,
                arabic: item.arabic,
                transliteration: resolveText(item.transliteration),
                translation: resolveText(item.translation),
                note: resolveText(item.note),
                evidence: item.evidence,
              }
            : null
        }
      />
    </>
  );
}
