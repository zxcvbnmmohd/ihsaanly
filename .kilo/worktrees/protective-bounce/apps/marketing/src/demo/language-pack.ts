// One language's worth of what the phone speaks: the app's string table and
// the content translation file, each its own chunk, fetched only for the
// page's language. Everything here is a dynamic import, so this module is
// tiny and can sit in the page bundle, letting the language download in
// parallel with the phone chunk rather than after it.

import type { TranslationFile } from '@ihsaanly/core/content/translations'
import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import type { Strings } from '@ihsaanly/core/strings/en'

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
    strings: (await import('@ihsaanly/core/strings/en')).en,
    translation: null,
  }),
  ar: () =>
    both(
      import('@ihsaanly/core/strings/ar').then((m) => m.ar),
      import('@ihsaanly/core/content/translations/ar.json'),
    ),
  fr: () =>
    both(
      import('@ihsaanly/core/strings/fr').then((m) => m.fr),
      import('@ihsaanly/core/content/translations/fr.json'),
    ),
  hi: () =>
    both(
      import('@ihsaanly/core/strings/hi').then((m) => m.hi),
      import('@ihsaanly/core/content/translations/hi.json'),
    ),
  it: () =>
    both(
      import('@ihsaanly/core/strings/it').then((m) => m.it),
      import('@ihsaanly/core/content/translations/it.json'),
    ),
  ja: () =>
    both(
      import('@ihsaanly/core/strings/ja').then((m) => m.ja),
      import('@ihsaanly/core/content/translations/ja.json'),
    ),
  so: () =>
    both(
      import('@ihsaanly/core/strings/so').then((m) => m.so),
      import('@ihsaanly/core/content/translations/so.json'),
    ),
  ur: () =>
    both(
      import('@ihsaanly/core/strings/ur').then((m) => m.ur),
      import('@ihsaanly/core/content/translations/ur.json'),
    ),
  yue: () =>
    both(
      import('@ihsaanly/core/strings/yue').then((m) => m.yue),
      import('@ihsaanly/core/content/translations/yue.json'),
    ),
  zh: () =>
    both(
      import('@ihsaanly/core/strings/zh').then((m) => m.zh),
      import('@ihsaanly/core/content/translations/zh.json'),
    ),
}

/** Fetches `language`'s string table and content translation. */
export async function loadLanguagePack(language: SupportedLanguage): Promise<LanguagePack> {
  return { language, ...(await LOADERS[language]()) }
}
