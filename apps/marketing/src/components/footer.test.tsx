import { afterEach, describe, expect, test } from 'bun:test'
import { APP_LINKS } from '@ihsaanly/web/app-links'
import { screen } from '@testing-library/react'
import { renderSite } from '../../test/site'

const { Footer } = await import('./footer')

const original = APP_LINKS.chromeWebStoreUrl

afterEach(() => {
  APP_LINKS.chromeWebStoreUrl = original
})

describe('Footer', () => {
  test('links the legal pages and support at the English root', () => {
    const { strings } = renderSite(<Footer />)
    expect(screen.getByRole('link', { name: strings['common.footer.support'] })).toHaveAttribute(
      'href',
      '/#questions',
    )
    expect(screen.getByRole('link', { name: strings['common.footer.privacy'] })).toHaveAttribute(
      'href',
      '/legal/privacy/',
    )
    expect(screen.getByRole('link', { name: strings['common.footer.terms'] })).toHaveAttribute(
      'href',
      '/legal/terms/',
    )
    expect(
      screen.getByRole('link', { name: strings['common.footer.deleteAccount'] }),
    ).toHaveAttribute('href', '/legal/delete-account/')
    expect(screen.getByRole('link', { name: 'support@ihsaanly.app' })).toHaveAttribute(
      'href',
      'mailto:support@ihsaanly.app',
    )
  })

  test('keeps the language in the links', () => {
    const { strings } = renderSite(<Footer />, { lang: 'ar' })
    expect(screen.getByRole('link', { name: strings['common.footer.privacy'] })).toHaveAttribute(
      'href',
      '/ar/legal/privacy/',
    )
  })

  test('marks only the current page', () => {
    const { strings } = renderSite(<Footer />, { routeId: '/{-$lang}/legal/terms/' })
    expect(screen.getByRole('link', { name: strings['common.footer.terms'] })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      screen.getByRole('link', { name: strings['common.footer.privacy'] }),
    ).not.toHaveAttribute('aria-current')
  })

  test.each([
    ['/{-$lang}/legal/privacy/', 'common.footer.privacy'],
    ['/{-$lang}/legal/delete-account/', 'common.footer.deleteAccount'],
  ])('marks %s as current', (routeId, key) => {
    const { strings } = renderSite(<Footer />, { routeId })
    expect(screen.getByRole('link', { name: strings[key] })).toHaveAttribute('aria-current', 'page')
  })

  test('has no Chrome extension link until a listing exists', () => {
    const { strings } = renderSite(<Footer />)
    expect(screen.queryByText(strings['common.footer.extension'] ?? '')).toBeNull()
  })

  test('links the Chrome extension once it is published', () => {
    APP_LINKS.chromeWebStoreUrl = 'https://chromewebstore.google.com/detail/x'
    const { strings } = renderSite(<Footer />)
    expect(screen.getByRole('link', { name: strings['common.footer.extension'] })).toHaveAttribute(
      'href',
      'https://chromewebstore.google.com/detail/x',
    )
  })
})
