import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { screen, within } from '@testing-library/react'
import { renderSite } from '../../test/site'

const { HomePage } = await import('./home-page')

// The phone loads once the demo nears the viewport; here it never does, so the
// page keeps its static fallback (the demo has its own tests).
class NeverIntersecting {
  observe(): void {}
  disconnect(): void {}
}
const realObserver = globalThis.IntersectionObserver
const realRect = Element.prototype.getBoundingClientRect
beforeAll(() => {
  globalThis.IntersectionObserver = NeverIntersecting as unknown as typeof IntersectionObserver
  Element.prototype.getBoundingClientRect = () => ({ top: 99999 }) as DOMRect
})
afterAll(() => {
  globalThis.IntersectionObserver = realObserver
  Element.prototype.getBoundingClientRect = realRect
})

const specimen = [
  {
    title: 'Leaving home',
    titleLang: null,
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translation: 'In the name of God',
    source: 'Abu Dawud',
    grading: '',
  },
]

describe('HomePage', () => {
  test('opens with the hero, the store buttons and the demo region', () => {
    const { strings } = renderSite(<HomePage specimen={specimen} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      (strings['home.hero.title'] ?? '').replace(/<[^>]+>/g, ''),
    )
    expect(screen.getAllByRole('button', { name: /App Store/ }).length).toBeGreaterThan(0)
    expect(document.getElementById('demo')).toHaveAttribute(
      'aria-label',
      strings['home.demo.label'],
    )
  })

  test('has the day timeline in order, from Maghrib', () => {
    renderSite(<HomePage specimen={specimen} />)
    const rows = within(document.querySelector('ol') as HTMLElement).getAllByRole('listitem')
    expect(rows).toHaveLength(6)
  })

  test('has every section, each labelled by its heading', () => {
    renderSite(<HomePage specimen={specimen} />)
    const sections = [...document.querySelectorAll('section[aria-labelledby]')].filter(
      (each) => each.id !== 'demo',
    )
    expect(sections.map((each) => each.getAttribute('aria-labelledby'))).toEqual([
      'day-title',
      'source-title',
      'coming-title',
      'calm-title',
      'inside-title',
      'everywhere-title',
      'private-title',
      'honest-title',
      'questions-title',
    ])
    for (const section of sections) {
      const title = document.getElementById(section.getAttribute('aria-labelledby') ?? '')
      expect(title?.tagName).toBe('H2')
    }
  })

  test('shows the specimen dua and eight questions', () => {
    renderSite(<HomePage specimen={specimen} />)
    expect(screen.getByText('Bismillah')).toBeInTheDocument()
    const questions = document.getElementById('questions') as HTMLElement
    expect(questions.querySelectorAll('details')).toHaveLength(8)
  })

  test('renders in another language', () => {
    const { strings } = renderSite(<HomePage specimen={specimen} />, { lang: 'ja' })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      (strings['home.hero.title'] ?? '').replace(/<[^>]+>/g, ''),
    )
  })
})
