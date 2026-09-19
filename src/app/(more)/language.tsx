import type { ReactElement } from 'react'

import { supportedLanguageOf } from '@/i18n/locale'
import { chooseLanguage, useLocale } from '@/i18n/store'
import { LanguageScreen } from '@/screens/language'

export default function LanguageRoute(): ReactElement {
  const language = supportedLanguageOf(useLocale())

  return <LanguageScreen language={language} onSelect={chooseLanguage} />
}
