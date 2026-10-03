import { beforeEach, describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderRoute, resetApp, strings } from '../../test/route'

beforeEach(resetApp)

describe('/settings', () => {
  it('links the legal pages and the GeoNames credit', async () => {
    await renderRoute('/settings')
    expect(await screen.findByRole('heading', { name: strings.more.title })).toBeInTheDocument()
    const links = {
      [strings.about.privacyPolicy]: 'https://ihsaanly.app/legal/privacy',
      [strings.about.termsOfUse]: 'https://ihsaanly.app/legal/terms',
      [strings.about.geonames]: 'https://www.geonames.org/about.html',
    }
    for (const [name, href] of Object.entries(links)) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  it('lists only the rows that have a screen in the popup, without Account in a local-only build', async () => {
    await renderRoute('/settings')
    await screen.findByRole('heading', { name: strings.more.title })
    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.startsWith('/'))
    expect(hrefs).toEqual([
      '/location',
      '/calculation',
      '/hijri',
      '/notifications',
      '/language',
      '/appearance',
      '/qada',
      '/today?tour=1',
    ])
  })

  it('opens a row in the router', async () => {
    const { user, router } = await renderRoute('/settings')
    const [row] = await screen.findAllByRole('link', { name: new RegExp(strings.location.title) })
    if (!row) throw new Error('no Location row')
    await user.click(row)
    expect(router.state.location.pathname).toBe('/location')
    expect(await screen.findByRole('heading', { name: strings.location.title })).toBeInTheDocument()
  })
})
