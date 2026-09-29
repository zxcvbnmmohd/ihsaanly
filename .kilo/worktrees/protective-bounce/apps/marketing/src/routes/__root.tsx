/// <reference types="vite/client" />
import {
  createRootRoute,
  HeadContent,
  Navigate,
  Outlet,
  Scripts,
  useMatches,
  useParams,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { isLocaleCode, LOCALES, localeFor } from '~/i18n/locales'
import appCss from '~/styles.css?url'
import { THEME_COLOR, THEME_SCRIPT, themeSearch } from '~/theme'

export const Route = createRootRoute({
  validateSearch: themeSearch,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [
      { rel: 'icon', href: '/assets/star.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/assets/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'stylesheet', href: appCss },
    ],
    scripts: [{ children: THEME_SCRIPT }],
  }),
  component: RootDocument,
  // The host serves 404.html for any unknown path; once hydrated, the router
  // shows the same page from its own /404/ route.
  notFoundComponent: (): ReactNode => <Navigate to="/404/" replace />,
})

function RootDocument(): ReactNode {
  const params = useParams({ strict: false })
  const lang = 'lang' in params ? params.lang : undefined
  const locale = localeFor(isLocaleCode(lang) ? lang : undefined)
  // The 404 page is not indexed, so it carries no Open Graph tags, as before.
  const indexed = !useMatches().some((match) => match.routeId === '/404')
  return (
    <html lang={locale.lang} dir={locale.dir} data-locale={locale.code}>
      <head>
        {/* Rendered here, not through head(): its de-duplication keeps one tag per name. */}
        <meta
          name="theme-color"
          content={THEME_COLOR.light}
          media="(prefers-color-scheme: light)"
        />
        <meta name="theme-color" content={THEME_COLOR.dark} media="(prefers-color-scheme: dark)" />
        {indexed &&
          LOCALES.filter((other) => other !== locale).map((other) => (
            <meta key={other.code} property="og:locale:alternate" content={other.og} />
          ))}
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
