// Head tags per page: title, description, canonical, hreflang alternates, Open
// Graph and, on the home page, JSON-LD. Ported from the old generator so the
// prerendered <head> matches what search engines already index.
import amiriWoff2 from '@ihsaanly/tailwind/fonts/Amiri-Regular.woff2?url'
import { absolute, BASE_URL, EMAIL, LOCALES, type Locale, type Page, pageUrl } from '~/i18n/locales'
import type { Strings } from '~/i18n/messages.server'
import { plain } from '~/i18n/rich-text'

type Meta = Record<string, string>
interface Head {
  meta: Meta[]
  links: Meta[]
  scripts: { type: string; children: string }[]
}

const ENGLISH = LOCALES[0]

function get(strings: Strings, key: string): string {
  return strings[key] ?? key
}

function jsonLd(locale: Locale, strings: Strings): string {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE_URL}/#organization`,
        name: 'Mohd Inc.',
        url: `${BASE_URL}/`,
        email: EMAIL,
        logo: absolute('/assets/apple-touch-icon.png'),
      },
      {
        '@type': 'MobileApplication',
        '@id': `${BASE_URL}/#app`,
        name: 'Ihsaanly',
        url: absolute(pageUrl(locale, '')),
        description: plain(get(strings, 'home.description')),
        operatingSystem: 'iOS, Android',
        applicationCategory: 'LifestyleApplication',
        inLanguage: LOCALES.map((each) => each.lang),
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': `${BASE_URL}/#organization` },
      },
    ],
  }
  // `<` is escaped so no string can close the script block early.
  return JSON.stringify(graph).replaceAll('<', '\\u003c')
}

export function pageHead(page: Page, locale: Locale, strings: Strings): Head {
  const title = plain(get(strings, page.titleKey))
  const description = plain(get(strings, page.descriptionKey))
  const url = absolute(pageUrl(locale, page.path))
  const shareDescription =
    page.id === 'home' ? plain(get(strings, 'home.shareDescription')) : description
  const links: Meta[] = [
    { rel: 'canonical', href: url },
    ...LOCALES.map((each) => ({
      rel: 'alternate',
      hrefLang: each.hreflang,
      href: absolute(pageUrl(each, page.path)),
    })),
    {
      rel: 'alternate',
      hrefLang: 'x-default',
      href: absolute(pageUrl(ENGLISH ?? locale, page.path)),
    },
  ]
  // Amiri is above the fold only where it sets the body text.
  if (locale.code === 'ar') {
    links.push({
      rel: 'preload',
      href: amiriWoff2,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: '',
    })
  }
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:site_name', content: 'Ihsaanly' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: shareDescription },
      { property: 'og:url', content: url },
      { property: 'og:type', content: 'website' },
      { property: 'og:locale', content: locale.og },
      { property: 'og:image', content: absolute(`/assets/og-${locale.code}.png`) },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: plain(get(strings, 'home.shareImageAlt')) },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links,
    scripts:
      page.id === 'home'
        ? [{ type: 'application/ld+json', children: jsonLd(locale, strings) }]
        : [],
  }
}

export function notFoundHead(strings: Strings): Head {
  return {
    meta: [
      { title: plain(get(strings, 'notFound.pageTitle')) },
      { name: 'description', content: plain(get(strings, 'home.description')) },
      { name: 'robots', content: 'noindex' },
    ],
    links: [],
    scripts: [],
  }
}
