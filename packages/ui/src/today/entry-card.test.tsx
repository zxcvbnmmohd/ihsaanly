import { describe, expect, it, mock } from 'bun:test'
import { screen, within } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import type { TodayEntry } from '../screens/today'
import { EntryCard } from './entry-card'
import { TourAnchorContext } from './tour-anchor'

const entry: TodayEntry = {
  id: 'duha',
  title: 'Duha prayer',
  detail: 'Optional',
  href: '/item/duha',
  mark: { done: false, progress: null },
}

describe('EntryCard', () => {
  // A border on the surface itself would sit under liquid glass, so it is a 1pt ring beside it.
  it('draws its 1pt border as a ring beside the surface, accent on the hero', () => {
    const ringColorOf = (variant: 'hero' | 'row'): string => {
      const { unmount } = renderScreen(
        <EntryCard entry={entry} onCircle={() => {}} variant={variant} testID={variant} />,
      )
      const ring = within(screen.getByTestId(variant)).getByTestId('surface-ring')
      expect(ring.style.borderWidth).toBe('1px')
      // The surface keeps a matching transparent border, so the layout is unchanged.
      expect((ring.previousElementSibling as HTMLElement).style.borderWidth).toBe('1px')
      expect(ring).not.toHaveTextContent('Duha prayer')
      const color = ring.style.borderColor
      unmount()
      return color
    }
    const hero = ringColorOf('hero')
    const row = ringColorOf('row')
    expect(hero).not.toBe(row)
    expect(hero).not.toBe('rgba(0, 0, 0, 0.00)')
    expect(row).not.toBe('rgba(0, 0, 0, 0.00)')
  })

  it('opens the item from the card and marks it from the circle, separately', async () => {
    const onCircle = mock((_id: string) => {})
    const { user, navigations, strings } = renderScreen(
      <EntryCard entry={entry} onCircle={onCircle} />,
    )
    const circle = screen.getByRole('button', { name: strings.today.markDone('Duha prayer') })
    const card = screen.getByRole('link', { name: strings.today.open('Duha prayer') })
    expect(card).not.toContainElement(circle)
    await user.click(circle)
    expect(onCircle).toHaveBeenCalledWith('duha')
    expect(navigations).toEqual([])
    await user.click(card)
    expect(navigations).toEqual(['/item/duha'])
    expect(onCircle).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Optional')).toBeInTheDocument()
    expect(screen.getByText('›')).toBeInTheDocument()
  })

  it('puts the circle first in keyboard order', async () => {
    const { user, strings } = renderScreen(<EntryCard entry={entry} onCircle={() => {}} />)
    await user.tab()
    expect(
      screen.getByRole('button', { name: strings.today.markDone('Duha prayer') }),
    ).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: strings.today.open('Duha prayer') })).toHaveFocus()
  })

  it('has no circle when there is nothing to mark', () => {
    renderScreen(<EntryCard entry={{ ...entry, mark: null, detail: null }} onCircle={() => {}} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows hover and press states without changing what it does', async () => {
    const { user, strings } = renderScreen(
      <EntryCard entry={entry} onCircle={() => {}} variant="hero" />,
      { scheme: 'dark' },
    )
    const card = screen.getByRole('link', { name: strings.today.open('Duha prayer') })
    await user.hover(card)
    await user.pointer({ keys: '[MouseLeft>]', target: card })
    await user.pointer({ keys: '[/MouseLeft]', target: card })
    expect(card).toBeInTheDocument()
  })

  it('draws the tour coach mark under itself when the tour points at it', () => {
    renderScreen(
      <TourAnchorContext.Provider value={{ id: 'duha', node: <span>coach here</span> }}>
        <EntryCard entry={entry} onCircle={() => {}} />
        <EntryCard entry={{ ...entry, id: 'other', title: 'Other' }} onCircle={() => {}} />
      </TourAnchorContext.Provider>,
    )
    expect(screen.getAllByText('coach here')).toHaveLength(1)
  })
})
