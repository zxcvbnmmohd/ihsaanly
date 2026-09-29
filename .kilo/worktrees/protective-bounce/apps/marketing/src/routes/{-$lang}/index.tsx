import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { HomePage } from '~/components/home-page'
import { getSpecimen } from '~/content/specimen'
import { isLocaleCode, localeFor, PAGES } from '~/i18n/locales'
import { headFrom } from '~/seo/route-head'

export const Route = createFileRoute('/{-$lang}/')({
  ssr: true,
  loader: async ({ params }) => ({
    specimen: await getSpecimen({ data: { lang: isLocaleCode(params.lang) ? params.lang : 'en' } }),
  }),
  head: ({ matches, params }) => headFrom(matches, PAGES.home, localeFor(params.lang)),
  component: Home,
})

function Home(): ReactNode {
  const { specimen } = Route.useLoaderData()
  return <HomePage specimen={specimen} />
}
