import { languageOf } from '@ihsaanly/core/i18n/locale'
import { ar } from '@ihsaanly/core/strings/ar'
import { en, type Strings } from '@ihsaanly/core/strings/en'
import { fr } from '@ihsaanly/core/strings/fr'
import { hi } from '@ihsaanly/core/strings/hi'
import { it } from '@ihsaanly/core/strings/it'
import { ja } from '@ihsaanly/core/strings/ja'
import { so } from '@ihsaanly/core/strings/so'
import { ur } from '@ihsaanly/core/strings/ur'
import { yue } from '@ihsaanly/core/strings/yue'
import { zh } from '@ihsaanly/core/strings/zh'
import { getLocale, useLocale } from '../i18n/store'

export type { Strings } from '@ihsaanly/core/strings/en'

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
