// Everything a component needs to speak the page's language: the locale, its
// strings, the page's link values, and t/a helpers.
import { useMatches, useParams } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  DONATE_URL,
  EMAIL,
  formatDate,
  isLocaleCode,
  LOCALES,
  type Locale,
  localeFor,
  PAGES,
  type Page,
  pageUrl,
} from './locales'
import type { Messages } from './messages'
import { fill, plain, rich } from './rich-text'

export interface Site {
  locale: Locale
  page: Page | null
  messages: Messages
  links: Record<string, string>
  /** A string with its inline markup rendered. */
  t: (key: string) => ReactNode
  /** A string for an attribute: tags dropped, placeholders filled. */
  a: (key: string) => string
}

function hasMessages(value: unknown): value is { messages: Messages } {
  return typeof value === 'object' && value !== null && 'messages' in value
}

function pageFor(routeId: string): Page | null {
  if (routeId.endsWith('/legal/privacy/') || routeId.endsWith('/legal/privacy'))
    return PAGES.privacy
  if (routeId.endsWith('/legal/terms/') || routeId.endsWith('/legal/terms')) return PAGES.terms
  if (routeId === '/{-$lang}/') return PAGES.home
  return null
}

export function useSite(): Site {
  const params = useParams({ strict: false })
  const matches = useMatches()
  const lang = 'lang' in params ? params.lang : undefined
  const locale = localeFor(isLocaleCode(lang) ? lang : undefined)
  const messages = matches.map((match) => match.loaderData).find(hasMessages)?.messages
  if (!messages) throw new Error('useSite needs a route that loads messages')
  const page = matches.map((match) => pageFor(match.routeId)).find(Boolean) ?? null
  const english = LOCALES[0] ?? locale
  const links: Record<string, string> = {
    home: pageUrl(locale, ''),
    privacy: pageUrl(locale, PAGES.privacy.path),
    terms: pageUrl(locale, PAGES.terms.path),
    support: `${pageUrl(locale, '')}#questions`,
    donate: DONATE_URL,
    email: `mailto:${EMAIL}`,
    english: pageUrl(english, page?.path ?? ''),
    year: String(new Date().getUTCFullYear()),
    date: page?.updated ? formatDate(page.updated, locale) : '',
  }
  const text = (key: string): string => {
    const value = messages.strings[key]
    if (value === undefined) throw new Error(`Unknown string "${key}"`)
    return fill(value, links)
  }
  return {
    locale,
    page,
    messages,
    links,
    t: (key) => rich(text(key)),
    a: (key) => plain(text(key)),
  }
}
