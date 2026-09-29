import { createFileRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { NotFoundPage } from '~/components/not-found-page'
import { SiteLayout } from '~/components/site-layout'
import { getMessages } from '~/i18n/messages'
import { notFoundHead } from '~/seo/head'

// Prerendered to /404.html, which the host serves for any unknown path.
export const Route = createFileRoute('/404')({
  ssr: true,
  loader: async () => ({ messages: await getMessages({ data: { lang: 'en' } }) }),
  head: ({ loaderData }) => (loaderData ? notFoundHead(loaderData.messages.strings) : {}),
  component: (): ReactNode => (
    <SiteLayout>
      <NotFoundPage />
    </SiteLayout>
  ),
})
