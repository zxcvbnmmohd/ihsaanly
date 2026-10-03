import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { screen } from '@testing-library/react'
import { LOCALE_KEY } from '~/i18n/locales'
import type { Messages } from '~/i18n/messages'
import { catalogue } from '~/i18n/messages.server'
import { plain } from '~/i18n/rich-text'
import { renderSite } from '../../test/site'

const { LocaleSuggestion } = await import('./locale-suggestion')

const offers: NonNullable<Messages['offers']> = Object.fromEntries(
  ['fr', 'ar', 'ja', 'yue', 'it'].map((code) => {
    const { strings } = catalogue(code as 'fr')
    return [
      code,
      {
        text: plain(strings['common.suggest.text'] ?? ''),
        dismiss: plain(strings['common.suggest.dismiss'] ?? ''),
      },
    ]
  }),
)

const languages = Object.getOwnPropertyDescriptor(navigator, 'languages')
const language = Object.getOwnPropertyDescriptor(navigator, 'language')

function prefer(...tags: string[]): void {
  Object.defineProperty(navigator, 'languages', { configurable: true, value: tags })
}

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  if (languages) Object.defineProperty(navigator, 'languages', languages)
  if (language) Object.defineProperty(navigator, 'language', language)
  window.localStorage.clear()
})

describe('LocaleSuggestion', () => {
  test("offers the visitor's language as a link to the same page", async () => {
    prefer('fr-CA', 'en')
    renderSite(<LocaleSuggestion />, { offers, routeId: '/{-$lang}/legal/terms/' })
    const link = await screen.findByRole('link', { name: 'Français' })
    expect(link).toHaveAttribute('href', '/fr/legal/terms/')
    expect(link).toHaveAttribute('hreflang', 'fr')
    expect(link.closest('div')).toHaveAttribute('lang', 'fr')
    expect(screen.getByRole('button', { name: offers.fr?.dismiss })).toBeInTheDocument()
  })

  test('the offer text surrounds the language link', async () => {
    prefer('fr')
    renderSite(<LocaleSuggestion />, { offers })
    const [before = '', after = ''] = (offers.fr?.text ?? '').split('{language}')
    const paragraph = (await screen.findByRole('link', { name: 'Français' })).closest('p')
    expect(paragraph?.textContent).toBe(`${before}Français${after}`)
  })

  test('an exact match wins over a language match', async () => {
    prefer('ja-JP')
    renderSite(<LocaleSuggestion />, { offers })
    expect(await screen.findByRole('link', { name: '日本語' })).toHaveAttribute('href', '/ja/')
  })

  test('Hong Kong and Macau read as Cantonese', async () => {
    prefer('zh-HK')
    renderSite(<LocaleSuggestion />, { offers })
    expect(
      await screen.findByRole('link', { name: catalogue('yue') && /粵|廣東|yue/i }),
    ).toHaveAttribute('href', '/yue/')
  })

  test('an unsupported region still matches its language', async () => {
    prefer('it-CH')
    renderSite(<LocaleSuggestion />, { offers })
    expect(await screen.findByRole('link', { name: 'Italiano' })).toHaveAttribute('href', '/it/')
  })

  test('falls back to navigator.language when there is no list', async () => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: [] })
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'ar-EG' })
    renderSite(<LocaleSuggestion />, { offers })
    expect(await screen.findByRole('link', { name: 'العربية' })).toHaveAttribute('href', '/ar/')
  })

  test('shows nothing for English, an unknown language or a language without an offer', () => {
    for (const tag of ['en-GB', 'xx', 'hi']) {
      prefer(tag)
      const { container, unmount } = renderSite(<LocaleSuggestion />, { offers })
      expect(container.innerHTML).toBe('')
      unmount()
    }
  })

  test('shows nothing on pages without offers (other languages)', () => {
    prefer('fr')
    const { container } = renderSite(<LocaleSuggestion />, { lang: 'fr', offers: null })
    expect(container.innerHTML).toBe('')
  })

  test('shows nothing once a language was chosen', () => {
    window.localStorage.setItem(LOCALE_KEY, 'en')
    prefer('fr')
    const { container } = renderSite(<LocaleSuggestion />, { offers })
    expect(container.innerHTML).toBe('')
  })

  test('following the link remembers the choice', async () => {
    prefer('fr')
    const { user } = renderSite(<LocaleSuggestion />, { offers })
    const link = await screen.findByRole('link', { name: 'Français' })
    link.addEventListener('click', (event) => event.preventDefault())
    await user.click(link)
    expect(window.localStorage.getItem(LOCALE_KEY)).toBe('fr')
  })

  test('dismissing remembers English and hides the banner', async () => {
    prefer('fr')
    const { user } = renderSite(<LocaleSuggestion />, { offers })
    await user.click(await screen.findByRole('button', { name: offers.fr?.dismiss }))
    expect(window.localStorage.getItem(LOCALE_KEY)).toBe('en')
    expect(screen.queryByRole('link', { name: 'Français' })).toBeNull()
  })

  test('a text without the placeholder still renders', async () => {
    prefer('fr')
    renderSite(<LocaleSuggestion />, { offers: { fr: { text: 'Bonjour', dismiss: 'Non' } } })
    expect(await screen.findByText('Bonjour', { exact: false })).toBeInTheDocument()
  })
})
