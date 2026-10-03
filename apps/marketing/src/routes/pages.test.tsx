import { describe, expect, test } from 'bun:test'
import { isRedirect } from '@tanstack/react-router'
import { renderToStaticMarkup } from 'react-dom/server'
import { localeFor, PAGES } from '~/i18n/locales'
import { catalogue } from '~/i18n/messages.server'
import { notFoundHead, pageHead } from '~/seo/head'
import { setSite, site } from '../../test/site'

const { Route: NotFound } = await import('./404')
const { Route: Index } = await import('./{-$lang}/index')
const { Route: Layout } = await import('./{-$lang}/route')
const { Route: Privacy } = await import('./{-$lang}/legal/privacy')
const { Route: Terms } = await import('./{-$lang}/legal/terms')
const { Route: Delete } = await import('./{-$lang}/legal/delete-account')

type Anything = never
const english = catalogue('en').strings
const messages = (lang: 'en' | 'fr'): { strings: Record<string, string>; offers: null } => ({
  strings: catalogue(lang).strings,
  offers: null,
})

describe('language layout', () => {
  const beforeLoad = Layout.options.beforeLoad as (context: Anything) => void

  test('English at the root and any supported language are fine', () => {
    expect(() => beforeLoad({ params: {} } as Anything)).not.toThrow()
    expect(() => beforeLoad({ params: { lang: 'fr' } } as Anything)).not.toThrow()
  })

  test.each(['en', 'xx'])('/%s/ is not a page: it redirects to the 404 page', (lang) => {
    let thrown: unknown
    try {
      beforeLoad({ params: { lang } } as Anything)
    } catch (error) {
      thrown = error
    }
    expect(isRedirect(thrown)).toBe(true)
    expect((thrown as { options: { to: string } }).options.to).toBe('/404/')
  })

  test('loads the messages for the language, English by default', async () => {
    const load = Layout.options.loader as (
      context: Anything,
    ) => Promise<{ messages: { strings: object; offers: unknown } }>
    expect((await load({ params: {} } as Anything)).messages.strings).toEqual(english)
    const french = await load({ params: { lang: 'fr' } } as Anything)
    expect(french.messages.strings).toEqual(catalogue('fr').strings)
    expect(french.messages.offers).toBeNull()
    expect((await load({ params: { lang: 'nonsense' } } as Anything)).messages.strings).toEqual(
      english,
    )
  })

  test('wraps the page in the site layout around the outlet', () => {
    setSite()
    const Component = Layout.options.component as () => React.ReactNode
    const html = renderToStaticMarkup(<Component />)
    expect(html).toContain('<main id="main"><div data-testid="outlet"></div></main>')
  })
})

describe('home route', () => {
  test('loads the specimen duas for the language', async () => {
    const load = Index.options.loader as (
      context: Anything,
    ) => Promise<{ specimen: { arabic: string }[] }>
    expect((await load({ params: {} } as Anything)).specimen).toHaveLength(3)
    expect((await load({ params: { lang: 'fr' } } as Anything)).specimen).toHaveLength(3)
    expect((await load({ params: { lang: 'zz' } } as Anything)).specimen).toHaveLength(3)
  })

  test('its head is the home page head in the right language', () => {
    const head = Index.options.head as (context: Anything) => unknown
    const matches = [{ loaderData: { messages: messages('fr') } }]
    expect(head({ matches, params: { lang: 'fr' } } as Anything)).toEqual(
      pageHead(PAGES.home, localeFor('fr'), catalogue('fr').strings),
    )
  })

  test('renders the page with the specimen it loaded', async () => {
    setSite()
    const load = Index.options.loader as (context: Anything) => Promise<{ specimen: unknown }>
    const loaded = await load({ params: {} } as Anything)
    ;(Index as unknown as { useLoaderData: () => unknown }).useLoaderData = () => loaded
    const Component = Index.options.component as () => React.ReactNode
    const html = renderToStaticMarkup(<Component />)
    expect(html).toContain('<h1')
    expect(html).toContain('id="demo"')
  })
})

describe.each([
  ['privacy', Privacy, PAGES.privacy],
  ['terms', Terms, PAGES.terms],
  ['delete-account', Delete, PAGES.deleteAccount],
] as const)('legal route %s', (_name, Route, page) => {
  test("its head is that page's head", () => {
    const head = Route.options.head as (context: Anything) => unknown
    expect(
      head({ matches: [{ loaderData: { messages: messages('en') } }], params: {} } as Anything),
    ).toEqual(pageHead(page, localeFor(undefined), english))
  })

  test('renders the legal page', () => {
    setSite({ routeId: `/{-$lang}/legal/${_name}/` })
    const Component = Route.options.component as () => React.ReactNode
    expect(renderToStaticMarkup(<Component />)).toContain('class="legal')
  })
})

describe('404 route', () => {
  test('loads English messages', async () => {
    const load = NotFound.options.loader as () => Promise<{ messages: { strings: object } }>
    expect((await load()).messages.strings).toEqual(english)
  })

  test('its head is the not-found head, or nothing before the messages load', () => {
    const head = NotFound.options.head as (context: Anything) => unknown
    expect(head({ loaderData: { messages: messages('en') } } as Anything)).toEqual(
      notFoundHead(english),
    )
    expect(head({ loaderData: undefined } as Anything)).toEqual({})
  })

  test('renders the not-found page inside the site layout', () => {
    setSite({ routeId: '/404' })
    site.lang = undefined
    const Component = NotFound.options.component as () => React.ReactNode
    const html = renderToStaticMarkup(<Component />)
    expect(html).toContain(english['notFound.title'] ?? '__')
  })
})
