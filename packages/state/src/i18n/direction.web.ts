/**
 * Runs in place of `./direction` when the bundler targets web (pattern: see
 * the header of `apps/mobile/src/widgets/publish.ts`). A browser has no
 * native layout direction to flip and nothing to reload for: it reads `dir`
 * and `lang` straight off `<html>`, so setting them is the whole job.
 */
import { isRightToLeft, type SupportedLocale } from '@ihsaanly/core/i18n/locale'

export function applyDirection(locale: SupportedLocale): boolean {
  document.documentElement.lang = locale
  document.documentElement.dir = isRightToLeft(locale) ? 'rtl' : 'ltr'
  return false
}
