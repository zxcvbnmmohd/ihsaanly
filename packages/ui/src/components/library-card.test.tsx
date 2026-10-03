import { describe, expect, it } from 'bun:test'
import { fireEvent, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { libraryCardFixture } from '../screens/fixtures'
import { LibraryCard } from './library-card'

// `?native` loads the native file itself: the preload only swaps a `.web` sibling in for the
// plain path. A template, so TypeScript does not look for a module of that name.
const NATIVE = '.tsx?native'
const native = (): Promise<{ LibraryCard: typeof LibraryCard }> => import(`./library-card${NATIVE}`)

const variants = [
  ['web', async () => LibraryCard],
  ['native', async () => (await native()).LibraryCard],
] as const

describe.each(variants)('LibraryCard (%s)', (_name, load) => {
  it('links to the entry with its ruling and status pills', async () => {
    const Card = await load()
    const { user, navigations, strings } = renderScreen(<Card {...libraryCardFixture} />)
    const link = screen.getByRole('link', { name: /Leaving home/ })
    expect(link).toHaveAttribute('href', '/item/dua-leaving-home')
    expect(screen.getByText(libraryCardFixture.entry.subtitle as string)).toBeInTheDocument()
    expect(screen.getByText(strings.ruling.sunnah)).toBeInTheDocument()
    expect(screen.getByText(strings.library.onToday)).toBeInTheDocument()
    expect(screen.queryByText(strings.library.known)).toBeNull()
    await user.click(link)
    expect(navigations).toEqual(['/item/dua-leaving-home'])
  })

  it('shows known, a fard ruling, a selected ring and an overriding href', async () => {
    const Card = await load()
    const entry = {
      ...libraryCardFixture.entry,
      ruling: 'fard' as const,
      onToday: false,
      known: true,
      subtitle: undefined,
    }
    const { strings, navigations, user } = renderScreen(
      <Card entry={entry} selected href="/panel/x" />,
      { scheme: 'dark' },
    )
    expect(screen.getByText(strings.ruling.fard)).toBeInTheDocument()
    expect(screen.getByText(strings.library.known)).toBeInTheDocument()
    expect(screen.queryByText(strings.library.onToday)).toBeNull()
    await user.click(screen.getByRole('link'))
    expect(navigations).toEqual(['/panel/x'])
  })
})

describe('LibraryCard (web) selection', () => {
  it('marks only the selected card as current', () => {
    renderScreen(
      <>
        <LibraryCard {...libraryCardFixture} selected href="/a" />
        <LibraryCard {...libraryCardFixture} href="/b" />
      </>,
    )
    const [open, other] = screen.getAllByRole('link')
    expect(open).toHaveAttribute('aria-current', 'true')
    expect(other).not.toHaveAttribute('aria-current')
  })
})

describe('LibraryCard (web) interaction states', () => {
  it('tints on hover and rings on focus', () => {
    renderScreen(<LibraryCard {...libraryCardFixture} />)
    const link = screen.getByRole('link')
    fireEvent.mouseEnter(link)
    fireEvent.focus(link)
    expect(link).toBeInTheDocument()
  })
})
