// One language's worth of what the phone speaks: the app's string table and
// the content translation file, each its own chunk, fetched only for the
// active language. Everything here is a dynamic import, so this module is
// tiny and can sit in the page bundle, letting the language download in
// parallel with the rest of the app rather than after it.

import type { TranslationFile } from '../content/translations'
import type { Strings } from '../strings/en'
import type { SupportedLanguage } from './locale'

export interface LanguagePack {
  language: SupportedLanguage
  strings: Strings
  /** Laid over the English content; null for English itself. */
  translation: TranslationFile | null
}

type Loaded = Omit<LanguagePack, 'language'>

async function both(
  strings: Promise<Strings>,
  translation: Promise<{ default: unknown }>,
): Promise<Loaded> {
  const [table, file] = await Promise.all([strings, translation])
  // Shape is checked by the content gate, as `translation-files.ts` assumes.
  return { strings: table, translation: file.default as TranslationFile }
}

// Spelled out per language: the bundler only splits imports it can see.
const LOADERS: Record<SupportedLanguage, () => Promise<Loaded>> = {
  en: async () => ({
    strings: (await import('../strings/en')).en,
    translation: null,
  }),
  ar: () =>
    both(
      import('../strings/ar').then((m) => m.ar),
      import('../../content/translations/ar.json'),
    ),
  fr: () =>
    both(
      import('../strings/fr').then((m) => m.fr),
      import('../../content/translations/fr.json'),
    ),
  hi: () =>
    both(
      import('../strings/hi').then((m) => m.hi),
      import('../../content/translations/hi.json'),
    ),
  it: () =>
    both(
      import('../strings/it').then((m) => m.it),
      import('../../content/translations/it.json'),
    ),
  ja: () =>
    both(
      import('../strings/ja').then((m) => m.ja),
      import('../../content/translations/ja.json'),
    ),
  so: () =>
    both(
      import('../strings/so').then((m) => m.so),
      import('../../content/translations/so.json'),
    ),
  ur: () =>
    both(
      import('../strings/ur').then((m) => m.ur),
      import('../../content/translations/ur.json'),
    ),
  yue: () =>
    both(
      import('../strings/yue').then((m) => m.yue),
      import('../../content/translations/yue.json'),
    ),
  zh: () =>
    both(
      import('../strings/zh').then((m) => m.zh),
      import('../../content/translations/zh.json'),
    ),
}

/** Fetches `language`'s string table and content translation. */
export async function loadLanguagePack(language: SupportedLanguage): Promise<LanguagePack> {
  return { language, ...(await LOADERS[language]()) }
}
