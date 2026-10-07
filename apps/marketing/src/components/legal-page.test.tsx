import { afterEach, describe, expect, test } from 'bun:test'
import { screen } from '@testing-library/react'
import { BUSINESS, formatDate, localeFor, PAGES as SITE_PAGES } from '~/i18n/locales'
import { renderSite } from '../../test/site'

const { LegalPage } = await import('./legal-page')

const original = { ...BUSINESS }
afterEach(() => Object.assign(BUSINESS, original))

const PAGES = [
  ['privacy', '/{-$lang}/legal/privacy/'],
  ['terms', '/{-$lang}/legal/terms/'],
  ['deleteAccount', '/{-$lang}/legal/delete-account/'],
] as const

describe('LegalPage', () => {
  test.each(PAGES)('%s: title, date line, summary and a body with sections', (page, routeId) => {
    const { strings } = renderSite(<LegalPage page={page} />, { routeId })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      strings[`${page}.title`] ?? '',
    )
    // The page's own "last updated" date, so bumping it never breaks this test.
    const updated = SITE_PAGES[page].updated as Date
    expect(screen.getByText(new RegExp(formatDate(updated, localeFor('en'))))).toBeInTheDocument()
    expect(document.querySelectorAll('.summary p').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(2)
    expect(screen.queryByText(strings['common.governs'] ?? '__none__')).toBeNull()
  })

  test.each(PAGES)('%s: other languages say the English text governs', (page, routeId) => {
    const { strings } = renderSite(<LegalPage page={page} />, { lang: 'fr', routeId })
    const english = screen.getByRole('link', { name: 'version anglaise' })
    expect(english).toHaveAttribute('href', routeId.replace('{-$lang}/', ''))
    expect(english.closest('p')).toHaveTextContent('prévaut')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      strings[`${page}.title`] ?? '',
    )
  })

  test('without a known page (no date) there is no governing note either', () => {
    const { strings } = renderSite(<LegalPage page="terms" />, { lang: 'fr', routeId: '/404' })
    expect(screen.queryByRole('link', { name: 'version anglaise' })).toBeNull()
    expect(strings['common.governs']).toBeTruthy()
  })

  test('the ordered steps on the delete-account page are a numbered list', () => {
    renderSite(<LegalPage page="deleteAccount" />, { routeId: '/{-$lang}/legal/delete-account/' })
    const steps = document.querySelector('ol')
    expect(steps?.children).toHaveLength(4)
  })

  test('the publisher block never prints a placeholder for an unknown province or address', () => {
    BUSINESS.province = null
    BUSINESS.address = null
    const { strings } = renderSite(<LegalPage page="privacy" />, {
      routeId: '/{-$lang}/legal/privacy/',
    })
    const block = screen
      .getAllByRole('link', { name: BUSINESS.email })
      .at(-1)
      ?.closest('p') as HTMLElement
    expect(block).toHaveTextContent(`${BUSINESS.name}${strings['common.country']}${BUSINESS.email}`)
    expect(block.querySelector('a')).toHaveAttribute('href', `mailto:${BUSINESS.email}`)
  })

  test('province and address appear once filled in, and the terms name the province law', () => {
    BUSINESS.province = 'Ontario'
    BUSINESS.address = '1 Main Street'
    const { strings } = renderSite(<LegalPage page="terms" />, {
      routeId: '/{-$lang}/legal/terms/',
    })
    const block = screen
      .getAllByRole('link', { name: BUSINESS.email })
      .at(-1)
      ?.closest('p') as HTMLElement
    expect(block).toHaveTextContent(`1 Main Street`)
    expect(block).toHaveTextContent(`Ontario, ${strings['common.country']}`)
    expect(document.body.textContent).toContain('Ontario')
  })
})
