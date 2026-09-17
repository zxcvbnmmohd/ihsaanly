import type { ReactElement } from 'react'

import { setContentLanguage } from '@/content'
import { languageOf, type SupportedLocale } from '@/i18n/locale'
import { applyDirection, setLocale, useLocale } from '@/i18n/store'
import { LanguageScreen } from '@/screens/language'

export default function LanguageRoute(): ReactElement {
  const locale = useLocale()

  const choose = (chosen: SupportedLocale): void => {
    setLocale(chosen)
    setContentLanguage(languageOf(chosen))
    applyDirection(chosen)
  }

  return <LanguageScreen locale={locale} onSelect={choose} />
}
