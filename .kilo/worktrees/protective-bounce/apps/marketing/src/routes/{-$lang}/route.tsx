import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SiteLayout } from '~/components/site-layout'
import { isLocaleCode } from '~/i18n/locales'
import { getMessages } from '~/i18n/messages'

export const Route = createFileRoute('/{-$lang}')({
  // English lives at the root; /en/ and unknown codes are not pages. The host
  // serves 404.html at such a URL, and this sends the router to the same page.
  beforeLoad: ({ params }) => {
    if (params.lang !== undefined && (params.lang === 'en' || !isLocaleCode(params.lang))) {
      throw redirect({ to: '/404/', replace: true })
    }
  },
  loader: async ({ params }) => ({
    messages: await getMessages({ data: { lang: isLocaleCode(params.lang) ? params.lang : 'en' } }),
  }),
  component: LanguageLayout,
})

function LanguageLayout(): ReactNode {
  return (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  )
}
