// Component-test host for the marketing site: the TanStack Router hooks the
// components read (params, matches, search) answer from `site`, and `Link`
// renders the anchor the prerendered page would contain. Everything else in
// the router stays real. Import this before the component under test.
import { mock } from 'bun:test'
import { type RenderResult, render } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { LocaleCode } from '~/i18n/locales'
import type { Messages } from '~/i18n/messages'
import { catalogue } from '~/i18n/messages.server'

interface SiteState {
  lang: string | undefined
  routeId: string
  search: { theme?: 'system' | 'light' | 'dark' }
  messages: Messages | null
}

export const site: SiteState = {
  lang: undefined,
  routeId: '/{-$lang}/',
  search: {},
  messages: null,
}

const real = await import('@tanstack/react-router')

function hrefFor(to: string, params: { lang?: string } | undefined, hash?: string): string {
  const path = to.replace('{-$lang}/', params?.lang ? `${params.lang}/` : '')
  return `${path}${hash ? `#${hash}` : ''}`
}

interface LinkProps {
  to: string
  params?: { lang?: string }
  hash?: string
  children?: ReactNode
  [attribute: string]: unknown
}

mock.module('@tanstack/react-router', () => ({
  ...real,
  useParams: () => (site.lang === undefined ? {} : { lang: site.lang }),
  useSearch: () => site.search,
  useMatches: () => [
    { routeId: site.routeId, loaderData: site.messages ? { messages: site.messages } : undefined },
  ],
  // Document-level pieces that need a live router: stand-ins that show where they render.
  Outlet: () => <div data-testid="outlet" />,
  HeadContent: () => <meta name="head-content" />,
  Scripts: () => <script data-testid="scripts" />,
  Navigate: ({ to }: { to: string }) => <i data-navigate={to} />,
  Link: ({ to, params, hash, children, ...rest }: LinkProps) => (
    <a href={hrefFor(to, params, hash)} {...rest}>
      {children}
    </a>
  ),
}))

export interface SiteOptions {
  lang?: LocaleCode
  routeId?: string
  offers?: Messages['offers']
  search?: SiteState['search']
}

/** Points the mocked router at a page: its language, route and loaded messages. */
export function setSite({
  lang,
  routeId = '/{-$lang}/',
  offers = null,
  search = {},
}: SiteOptions = {}): {
  strings: Record<string, string>
} {
  const { strings } = catalogue(lang ?? 'en')
  site.lang = lang === 'en' ? undefined : lang
  site.routeId = routeId
  site.search = search
  site.messages = { strings, offers }
  return { strings }
}

export type SiteRender = RenderResult & { strings: Record<string, string>; user: UserEvent }

export function renderSite(ui: ReactNode, options?: SiteOptions): SiteRender {
  const { strings } = setSite(options)
  return { strings, user: userEvent.setup(), ...render(ui) }
}
