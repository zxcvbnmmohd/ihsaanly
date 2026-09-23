import { languageOf } from '@/i18n/locale'
import { getLocale, useLocale } from '@/i18n/store'

import { ar } from './ar'
import { en, type Strings } from './en'
import { fr } from './fr'
import { hi } from './hi'
import { it } from './it'
import { ja } from './ja'
import { so } from './so'
import { ur } from './ur'
import { yue } from './yue'
import { zh } from './zh'

export type { Strings } from './en'

/**
 * A language joins this table once every string is present; the type makes
 * that so. Every table but English is a draft awaiting a qualified speaker.
 */
const SHIPPED: Record<string, Strings> = { en, ar, fr, hi, it, ja, so, ur, yue, zh }

export function stringsFor(language: string): Strings {
  return SHIPPED[language] ?? en
}

/** For code that runs outside React. Components use useStrings(). */
export function getStrings(): Strings {
  return stringsFor(languageOf(getLocale()))
}

export function useStrings(): Strings {
  return stringsFor(languageOf(useLocale()))
}
