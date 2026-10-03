import { describe, expect, test } from 'bun:test'
import { screen, within } from '@testing-library/react'
import { renderSite } from '../../test/site'

const { Header } = await import('./header')
const { COMPANION_URL } = await import('~/links')

describe('Header', () => {
  test('brand links home at the root in English', () => {
    const { strings } = renderSite(<Header />)
    const brand = screen.getByRole('link', { name: strings['common.brandHome'] })
    expect(brand).toHaveAttribute('href', '/')
    expect(brand).toHaveTextContent('Ihsaanly')
  })

  test('brand links to the language home in another language', () => {
    const { strings } = renderSite(<Header />, { lang: 'fr' })
    expect(screen.getByRole('link', { name: strings['common.brandHome'] })).toHaveAttribute(
      'href',
      '/fr/',
    )
  })

  test('the call to action opens the web app, with a long and a short label', () => {
    const { strings } = renderSite(<Header />)
    const cta = document.querySelector(`a[href="${COMPANION_URL}"]`) as HTMLElement
    expect(cta).not.toBeNull()
    const long = within(cta).getByText(strings['common.openApp'] ?? '')
    const short = within(cta).getByText(strings['common.openAppShort'] ?? '')
    expect(long).toHaveClass('max-[40rem]:hidden')
    expect(short).toHaveClass('hidden')
  })

  test('holds the language menu and the theme button', () => {
    renderSite(<Header />)
    expect(document.querySelector('details')).not.toBeNull()
    expect(document.querySelector('button[data-mode]')).not.toBeNull()
  })
})
