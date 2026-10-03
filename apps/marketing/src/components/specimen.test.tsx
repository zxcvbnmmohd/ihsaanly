import { describe, expect, test } from 'bun:test'
import { screen } from '@testing-library/react'
import type { SpecimenDua } from '~/content/specimen'
import { renderSite } from '../../test/site'

const { Specimen } = await import('./specimen')

const duas: SpecimenDua[] = [
  {
    title: 'Leaving home',
    titleLang: null,
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translation: 'In the name of God',
    source: 'Abu Dawud',
    grading: '(Sahih)',
  },
  {
    title: 'Riding',
    titleLang: 'en',
    arabic: 'سُبْحَانَ',
    transliteration: 'Subhana',
    translation: null,
    source: 'Tirmidhi',
    grading: '',
  },
]

describe('Specimen', () => {
  test('shows the first dua with its source and grading', () => {
    renderSite(<Specimen duas={duas} />)
    expect(screen.getByRole('heading', { name: 'Leaving home' })).not.toHaveAttribute('lang')
    expect(screen.getByText('بِسْمِ اللَّهِ')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText('Bismillah')).toBeVisible()
    expect(screen.getByText('In the name of God')).toBeVisible()
    expect(screen.getByText('Abu Dawud').parentElement).toHaveTextContent('Abu Dawud (Sahih)')
  })

  test('"next" cycles through the duas and wraps around', async () => {
    const { user, strings } = renderSite(<Specimen duas={duas} />)
    const next = screen.getByRole('button', { name: strings['home.specimen.next'] })
    await user.click(next)
    const title = screen.getByRole('heading', { name: 'Riding' })
    expect(title).toHaveAttribute('lang', 'en')
    expect(screen.queryByText('In the name of God')).toBeNull()
    expect(screen.getByText('Tirmidhi').parentElement?.textContent).toBe('Tirmidhi')
    await user.click(next)
    expect(screen.getByRole('heading', { name: 'Leaving home' })).toBeInTheDocument()
  })

  test('hides and shows the transliteration and the translation', async () => {
    const { user, strings } = renderSite(<Specimen duas={duas} />)
    const hideTransliteration = screen.getByRole('button', {
      name: strings['home.specimen.hideTransliteration'],
    })
    const hideTranslation = screen.getByRole('button', {
      name: strings['home.specimen.hideTranslation'],
    })
    expect(hideTransliteration).toHaveAttribute('aria-pressed', 'false')
    await user.click(hideTransliteration)
    expect(hideTransliteration).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Bismillah')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('In the name of God')).toHaveAttribute('aria-hidden', 'false')
    await user.click(hideTranslation)
    expect(screen.getByText('In the name of God')).toHaveAttribute('aria-hidden', 'true')
    await user.click(hideTransliteration)
    await user.click(hideTranslation)
    expect(screen.getByText('Bismillah')).toHaveAttribute('aria-hidden', 'false')
    expect(screen.getByText('In the name of God')).toHaveAttribute('aria-hidden', 'false')
  })

  test('a single dua has no "next"; no translations means no translation button', () => {
    const [first] = duas
    if (!first) throw new Error('fixture')
    const { strings } = renderSite(<Specimen duas={[{ ...first, translation: null }]} />)
    expect(screen.queryByRole('button', { name: strings['home.specimen.next'] })).toBeNull()
    expect(
      screen.queryByRole('button', { name: strings['home.specimen.hideTranslation'] }),
    ).toBeNull()
  })

  test('renders nothing without duas', () => {
    const { container } = renderSite(<Specimen duas={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
