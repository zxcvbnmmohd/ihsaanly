// Everything a component needs to speak the page's language: the locale, its
// strings, the page's link values, and t/a helpers.
import { useMatches, useParams } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { COMPANION_URL } from '~/links'
import {
  BUSINESS,
  DONATE_URL,
  EMAIL,
  formatDate,
  isLocaleCode,
  LOCALES,
  type Locale,
  localeFor,
  PAGES,
  type Page,
  PRIVACY_EMAIL,
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
  if (routeId.endsWith('/legal/delete-account/') || routeId.endsWith('/legal/delete-account'))
    return PAGES.deleteAccount
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
    deleteAccount: pageUrl(locale, PAGES.deleteAccount.path),
    support: `${pageUrl(locale, '')}#questions`,
    donate: DONATE_URL,
    companion: COMPANION_URL,
    companionHost: new URL(COMPANION_URL).host,
    email: `mailto:${EMAIL}`,
    privacyEmail: `mailto:${PRIVACY_EMAIL}`,
    // The province in this language, for the terms' governing law; the postal
    // block on the legal pages keeps the address form (BUSINESS.province).
    province: BUSINESS.province ? (messages.strings['common.province'] ?? BUSINESS.province) : '',
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
