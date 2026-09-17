import document from '../../content/items.json';
import type { ContentDocument, Item } from './schema';

/**
 * Shape is guaranteed by the build gate, so the app does not re-parse the
 * document at startup.
 */
export const content = document as ContentDocument;

export const items = content.items;

export function itemById(id: string): Item | undefined {
  return items.find((item) => item.id === id);
}

/** Replaced by locale-aware resolution in #19. */
export const CURRENT_LANGUAGE = 'en';

export function resolveText(
  field: Record<string, string> | null | undefined,
  locale: string = CURRENT_LANGUAGE,
): string | null {
  if (!field) return null;
  const language = locale.split('-')[0] ?? locale;
  return field[locale] ?? field[language] ?? null;
}
