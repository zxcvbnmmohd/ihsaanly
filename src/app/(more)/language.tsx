import type { ReactElement } from 'react'

import { chooseLocale, useLocale } from '@/i18n/store'
import { LanguageScreen } from '@/screens/language'

export default function LanguageRoute(): ReactElement {
  const locale = useLocale()

  return <LanguageScreen locale={locale} onSelect={chooseLocale} />
}
