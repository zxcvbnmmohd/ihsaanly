import type { ReactElement } from 'react'
import { Alert } from 'react-native'

import { supportedLanguageOf, type SupportedLanguage } from '@/i18n/locale'
import { chooseLanguage, useLocale } from '@/i18n/store'
import { LanguageScreen } from '@/screens/language'
import { useStrings } from '@/strings'

export default function LanguageRoute(): ReactElement {
  const language = supportedLanguageOf(useLocale())
  const strings = useStrings()

  // Android reloads itself. iOS cannot, so the one honest thing is to say so
  // rather than leave the screen half turned around.
  const select = (chosen: SupportedLanguage): void => {
    if (!chooseLanguage(chosen)) return
    Alert.alert(strings.language.reopenTitle, strings.language.reopenBody)
  }

  return <LanguageScreen language={language} onSelect={select} />
}
