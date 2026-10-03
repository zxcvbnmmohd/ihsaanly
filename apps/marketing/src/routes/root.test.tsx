import { describe, expect, test } from 'bun:test'
import { THEME_COLOR, THEME_SCRIPT } from '@ihsaanly/web/theme'
import { renderToStaticMarkup } from 'react-dom/server'
import { LOCALES } from '~/i18n/locales'
import { setSite } from '../../test/site'

const { Route } = await import('./__root')

function page(options?: Parameters<typeof setSite>[0]): string {
  setSite(options)
  const Component = Route.options.component as () => React.ReactNode
  return renderToStaticMarkup(<Component />)
}

describe('root route', () => {
  test('the head sets the charset, viewport, icons, manifest, stylesheet and the pre-paint theme script', () => {
    const head = (
      Route.options.head as () => { meta: object[]; links: { rel: string }[]; scripts: object[] }
    )()
    expect(head.meta).toEqual([
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ])
    expect(head.links.map((link) => link.rel)).toEqual([
      'icon',
      'apple-touch-icon',
      'manifest',
      'stylesheet',
    ])
    expect(head.scripts).toEqual([{ children: THEME_SCRIPT }])
  })

  test('accepts only a valid ?theme= search', () => {
    const schema = Route.options.validateSearch as { parse: (input: unknown) => unknown }
    expect(schema.parse({ theme: 'dark' })).toEqual({ theme: 'dark' })
    expect(() => schema.parse({ theme: 'purple' })).toThrow()
  })

  test('the document carries the page language, direction and locale', () => {
    const html = page({ lang: 'ar' })
    expect(html).toContain('<html lang="ar" dir="rtl" data-locale="ar">')
    expect(page()).toContain('<html lang="en" dir="ltr" data-locale="en">')
  })

  test('both theme colours, the head content, the outlet and the scripts are present', () => {
    const html = page()
    expect(html).toContain(`content="${THEME_COLOR.light}" media="(prefers-color-scheme: light)"`)
    expect(html).toContain(`content="${THEME_COLOR.dark}" media="(prefers-color-scheme: dark)"`)
    expect(html).toContain('name="head-content"')
    expect(html).toContain('data-testid="outlet"')
    expect(html).toContain('data-testid="scripts"')
  })

  test('indexed pages announce every other language as an alternate Open Graph locale', () => {
    const html = page({ lang: 'fr' })
    expect(html.match(/property="og:locale:alternate"/g)).toHaveLength(LOCALES.length - 1)
    expect(html).not.toContain('content="fr_FR" ')
    expect(html).toContain('content="en_US"')
  })

  test('the 404 page is not indexed and carries no Open Graph tags', () => {
    expect(page({ routeId: '/404' })).not.toContain('og:locale:alternate')
  })

  test('an unknown route sends the visitor to the 404 page', () => {
    const NotFound = Route.options.notFoundComponent as () => React.ReactNode
    expect(renderToStaticMarkup(<NotFound />)).toBe('<i data-navigate="/404/"></i>')
  })
})
