import { afterEach, describe, expect, test } from 'bun:test'
import { APP_LINKS } from '@ihsaanly/web/app-links'
import { screen, waitFor } from '@testing-library/react'
import { renderSite } from '../../test/site'

const { StoreBadges } = await import('./store-badges')

const original = { ...APP_LINKS }

afterEach(() => Object.assign(APP_LINKS, original))

describe('StoreBadges', () => {
  test('before launch every store is a "coming soon" button', async () => {
    const { strings, user } = renderSite(<StoreBadges />)
    const soon = (store: string): string =>
      (strings['home.stores.soon'] ?? '').replace('{store}', store)
    const app = screen.getByText(/App Store/).closest('[aria-disabled="true"]') as HTMLElement
    expect(app).not.toBeNull()
    await user.click(app)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(soon('App Store')))
    const play = screen.getByText(/Google Play/).closest('[aria-disabled="true"]') as HTMLElement
    await user.click(play)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(soon('Google Play')))
    const chrome = screen
      .getByText(/Chrome Web Store/)
      .closest('[aria-disabled="true"]') as HTMLElement
    await user.click(chrome)
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(strings['home.stores.chromeSoon'] ?? ''),
    )
    expect(screen.queryByAltText(strings['home.stores.chromeAlt'] ?? '')).toBeNull()
  })

  test('published listings are real links', () => {
    APP_LINKS.appStoreUrl = 'https://apps.apple.com/app/x'
    APP_LINKS.playUrl = 'https://play.google.com/store/apps/details?id=x'
    APP_LINKS.chromeWebStoreUrl = 'https://chromewebstore.google.com/detail/x'
    const { strings } = renderSite(<StoreBadges />)
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('https://apps.apple.com/app/x')
    expect(hrefs).toContain('https://play.google.com/store/apps/details?id=x')
    expect(hrefs).toContain('https://chromewebstore.google.com/detail/x')
    expect(screen.getByAltText(strings['home.stores.chromeAlt'] ?? '')).toHaveAttribute(
      'src',
      '/assets/chrome-web-store-badge.png',
    )
  })
})
