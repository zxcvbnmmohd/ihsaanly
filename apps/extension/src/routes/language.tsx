import { supportedLanguageOf } from '@ihsaanly/core/i18n/locale'
import { chooseLanguage, useLocale } from '@ihsaanly/state/i18n/store'
import { useStrings } from '@ihsaanly/state/strings'
import { LanguageScreen } from '@ihsaanly/ui/screens/language'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/language')({ component: LanguageRoute })

/**
 * The web's `applyDirection` (packages/state/src/i18n/direction.web.ts) sets
 * `<html dir>`/`lang` directly and never needs a reload, unlike native, so
 * there is nothing here to ask the user to reopen for.
 */
function LanguageRoute(): ReactElement {
  const strings = useStrings()
  const language = supportedLanguageOf(useLocale())

  return (
    <>
      <PageHeader title={strings.language.title} />
      <LanguageScreen language={language} onSelect={chooseLanguage} />
    </>
  )
}
