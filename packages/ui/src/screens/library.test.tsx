import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { emptyLibraryFixture, libraryFixture } from './fixtures'
import { LIBRARY_FILTERS, type LibraryFilter, LibraryScreen } from './library'

describe.each(['compact', 'regular', 'wide'] as const)('LibraryScreen at %s', (layout) => {
  it('shows filters with counts, the terms row and entries by category', async () => {
    const { user, navigations, strings } = renderScreen(<LibraryScreen {...libraryFixture} />, {
      layout,
    })
    expect(screen.getAllByRole('button')).toHaveLength(LIBRARY_FILTERS.length)
    expect(
      screen.getByRole('button', { name: `${strings.library.filterAll} · 1` }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: strings.category.home })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: named('Leaving home') })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: named('Sunnah around Dhuhr') })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: named(strings.library.terms) }))
    expect(navigations).toEqual(['/glossary'])
  })

  it('reports a filter change', async () => {
    const onFilterChange = mock((_filter: LibraryFilter) => {})
    const { user, strings } = renderScreen(
      <LibraryScreen {...libraryFixture} onFilterChange={onFilterChange} />,
      { layout },
    )
    await user.click(screen.getByRole('button', { name: `${strings.library.filterKnown} · 0` }))
    expect(onFilterChange).toHaveBeenCalledWith('known')
  })

  it('hosts the search field', async () => {
    const onQueryChange = mock((_query: string) => {})
    const { user, strings } = renderScreen(
      <LibraryScreen
        {...libraryFixture}
        searchable={{ query: '', onQueryChange, placeholder: 'Search by name' }}
      />,
      { layout },
    )
    // Named apart from the placeholder, which is only a hint.
    const field = screen.getByRole('textbox', { name: strings.library.searchLabel })
    expect(field).toHaveAttribute('placeholder', 'Search by name')
    await user.type(field, 'z')
    expect(onQueryChange).toHaveBeenCalledWith('z')
  })

  it('has no search field unless the host asks', () => {
    renderScreen(<LibraryScreen {...libraryFixture} searchable={undefined} />, { layout })
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('hides the terms row while searching or filtering', () => {
    const { strings } = renderScreen(<LibraryScreen {...libraryFixture} query="du" />, { layout })
    expect(screen.queryByRole('link', { name: named(strings.library.terms) })).toBeNull()
  })

  it('hides the terms row under a filter, and shows the empty message for it', () => {
    const { strings } = renderScreen(
      <LibraryScreen {...emptyLibraryFixture} query="" filter="known" />,
      { layout },
    )
    expect(screen.queryByRole('link', { name: named(strings.library.terms) })).toBeNull()
    expect(screen.getByText(strings.library.emptyKnown)).toBeInTheDocument()
  })

  it.each([
    ['', 'all', 'empty'],
    ['', 'onToday', 'emptyOnToday'],
    ['  ', 'known', 'emptyKnown'],
    ['zzz', 'all', 'noResults'],
  ] as const)('explains an empty %j / %s library', (query, filter, key) => {
    const { strings } = renderScreen(
      <LibraryScreen {...emptyLibraryFixture} query={query} filter={filter} />,
      { layout },
    )
    expect(screen.getByText(strings.library[key])).toBeInTheDocument()
  })
})

describe('LibraryScreen section titles', () => {
  it('falls back to the raw category when it has no label', () => {
    renderScreen(
      <LibraryScreen
        {...libraryFixture}
        sections={[{ category: 'mystery', entries: libraryFixture.sections[0]?.entries ?? [] }]}
      />,
      { layout: 'compact' },
    )
    expect(screen.getByRole('heading', { name: 'mystery' })).toBeInTheDocument()
  })

  it('falls back to the raw category in the grid too', () => {
    renderScreen(
      <LibraryScreen
        {...libraryFixture}
        sections={[{ category: 'mystery', entries: libraryFixture.sections[0]?.entries ?? [] }]}
      />,
      { layout: 'wide' },
    )
    expect(screen.getByRole('heading', { name: 'mystery' })).toBeInTheDocument()
  })
})
