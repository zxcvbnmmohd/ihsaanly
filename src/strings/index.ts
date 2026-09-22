import { languageOf } from '@/i18n/locale'
import { getLocale, useLocale } from '@/i18n/store'

import { ar } from './ar'
import { en, type Strings } from './en'

export type { Strings } from './en'

/**
 * A language joins this table once every string is present. Arabic is a
 * complete draft awaiting review by a qualified speaker; see ar.ts.
 */
const SHIPPED: Record<string, Strings> = { en, ar }

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
