import { beforeEach, describe, expect, test } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { LOCALE_KEY, LOCALES } from '~/i18n/locales'
import { renderSite } from '../../test/site'

const { LanguageMenu } = await import('./language-menu')

beforeEach(() => window.localStorage.clear())

function details(): HTMLDetailsElement {
  return document.querySelector('details') as HTMLDetailsElement
}

describe('LanguageMenu', () => {
  test('names the current language and lists every language on the same page', () => {
    const { strings } = renderSite(<LanguageMenu />, {
      lang: 'fr',
      routeId: '/{-$lang}/legal/terms/',
    })
    expect(screen.getByText(`${strings['common.language.label']}: Français`)).toBeInTheDocument()
    const links = screen.getAllByRole('link', { hidden: true })
    expect(links).toHaveLength(LOCALES.length)
    expect(links.map((link) => link.getAttribute('href'))).toContain('/legal/terms/')
    expect(links.map((link) => link.getAttribute('href'))).toContain('/fr/legal/terms/')
    const current = links.filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current.map((link) => link.getAttribute('data-locale'))).toEqual(['fr'])
  })

  test('links the home page when no page is known', () => {
    renderSite(<LanguageMenu />, { routeId: '/404' })
    const hrefs = screen
      .getAllByRole('link', { hidden: true })
      .map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/ar/')
  })

  test('choosing a language remembers it', () => {
    renderSite(<LanguageMenu />)
    const arabic = document.querySelector('a[data-locale="ar"]') as HTMLAnchorElement
    arabic.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(arabic)
    expect(window.localStorage.getItem(LOCALE_KEY)).toBe('ar')
  })

  test('a click outside closes it; a click inside does not', () => {
    renderSite(<LanguageMenu />)
    details().open = true
    fireEvent.click(details().querySelector('ul') as HTMLElement)
    expect(details().open).toBe(true)
    fireEvent.click(document.body)
    expect(details().open).toBe(false)
  })

  test('Escape closes it and returns focus to the button', () => {
    renderSite(<LanguageMenu />)
    details().open = true
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(details().open).toBe(false)
    expect(document.activeElement).toBe(details().querySelector('summary'))
  })

  test('other keys, and Escape while closed, do nothing', () => {
    renderSite(<LanguageMenu />)
    details().open = true
    fireEvent.keyDown(document, { key: 'a' })
    expect(details().open).toBe(true)
    details().open = false
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).not.toBe(details().querySelector('summary'))
  })

  test('stops listening when it unmounts', () => {
    const { unmount } = renderSite(<LanguageMenu />)
    const element = details()
    element.open = true
    unmount()
    fireEvent.click(document.body)
    expect(element.open).toBe(true)
  })
})
