import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { LegalPage } from '~/components/legal-page'
import { localeFor, PAGES } from '~/i18n/locales'
import { headFrom } from '~/seo/route-head'

export const Route = createFileRoute('/{-$lang}/legal/delete-account')({
  ssr: true,
  head: ({ matches, params }) => headFrom(matches, PAGES.deleteAccount, localeFor(params.lang)),
  component: (): ReactNode => <LegalPage page="deleteAccount" />,
})
