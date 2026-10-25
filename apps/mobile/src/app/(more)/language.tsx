import { supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { chooseLanguage, useLocale } from '@ihsaanly/state/i18n/store'
import { LanguageScreen } from '@ihsaanly/ui/screens/language'
import type { ReactElement } from 'react'

// A pick that flips the layout direction reloads the app (`applyDirection`).
export default function LanguageRoute(): ReactElement {
  const language = supportedLanguageOf(useLocale())
  return <LanguageScreen language={language} onSelect={chooseLanguage} />
}
