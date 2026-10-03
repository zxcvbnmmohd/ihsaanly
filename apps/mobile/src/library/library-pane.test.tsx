import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { act, fireEvent } from '@testing-library/react'
import type { ComponentProps, ReactElement } from 'react'
import { renderScreen } from '../../../../packages/ui/test/render'
import { searchBars } from '../../test/library'
import { router } from '../../test/router'

type LibraryProps = ComponentProps<typeof import('@ihsaanly/ui/screens/library').LibraryScreen>

const libraryProps: LibraryProps[] = []
mock.module('@ihsaanly/ui/screens/library', () => ({
  LibraryScreen: (props: LibraryProps): ReactElement => {
    libraryProps.push(props)
    return <div data-testid="library-screen" />
  },
}))

beforeEach(() => {
  libraryProps.length = 0
  searchBars.length = 0
})

const { LibraryPane, libraryPath } = await import('./library-pane')
const { items } = await import('@ihsaanly/core/content')
const { toggleEnabled } = await import('@ihsaanly/state/plan/enabled-store')
const { toggleKnown } = await import('@ihsaanly/state/memorise/store')

const last = (): LibraryProps => {
  const props = libraryProps.at(-1)
  if (!props) throw new Error('LibraryScreen did not render')
  return props
}

describe('libraryPath', () => {
  it('is null while another tab is focused', () => {
    expect(libraryPath(['(more)', 'language'], '/language')).toBeNull()
  })

  it('splits the pathname while the library tab is focused', () => {
    expect(libraryPath(['(library)', 'item', '[id]'], '/item/abc')).toEqual(['item', 'abc'])
    expect(libraryPath(['(library)'], '/')).toEqual([])
  })
})

describe('LibraryPane at compact width', () => {
  it('lists every item, with a native search bar and no inline search field', () => {
    renderScreen(<LibraryPane />, { layout: 'compact' })
    const props = last()
    expect(props.counts.all).toBe(items.length)
    expect(props.sections.flatMap((section) => section.entries)).toHaveLength(items.length)
    expect(props.glossaryHref).toBe('/glossary')
    expect(props.searchable).toBeUndefined()
    expect(props.selectedId).toBeUndefined()
    expect(searchBars).toHaveLength(1)
  })

  it('sorts sections by their label and links each entry to its item', () => {
    renderScreen(<LibraryPane />, { layout: 'compact' })
    const sections = last().sections
    const first = sections[0]?.entries[0]
    expect(first?.href).toBe(`/item/${first?.id}`)
    const categories = sections.map((section) => section.category)
    expect(new Set(categories).size).toBe(categories.length)
  })

  it('drives the query from the search bar and clears it on cancel and close', () => {
    renderScreen(<LibraryPane />, { layout: 'compact' })
    const title = last().sections[0]?.entries[0]?.title ?? ''
    act(() => searchBars.at(-1)?.onChangeText({ nativeEvent: { text: title } }))
    expect(last().query).toBe(title)
    expect(last().counts.all).toBeLessThanOrEqual(items.length)
    expect(last().counts.all).toBeGreaterThan(0)

    act(() => searchBars.at(-1)?.onCancelButtonPress())
    expect(last().query).toBe('')

    act(() => searchBars.at(-1)?.onChangeText({ nativeEvent: { text: 'zzzzqqqq' } }))
    expect(last().counts.all).toBe(0)
    act(() => searchBars.at(-1)?.onClose())
    expect(last().counts.all).toBe(items.length)

    act(() => searchBars.at(-1)?.onChangeText({ nativeEvent: {} }))
    expect(last().query).toBe('')
  })

  it('narrows by filter and counts what is on Today and known', () => {
    const id = items[0]?.id ?? ''
    renderScreen(<LibraryPane />, { layout: 'compact' })
    const find = (): LibraryProps['sections'][number]['entries'][number] | undefined =>
      last()
        .sections.flatMap((section) => section.entries)
        .find((candidate) => candidate.id === id)
    const before = { entry: find(), counts: last().counts }
    act(() => toggleEnabled(id))
    act(() => toggleKnown(id))
    const delta = (was: boolean | undefined): number => (was ? -1 : 1)
    expect(last().counts.onToday).toBe(before.counts.onToday + delta(before.entry?.onToday))
    expect(last().counts.known).toBe(before.counts.known + delta(before.entry?.known))
    expect(find()?.onToday).toBe(!before.entry?.onToday)
    expect(find()?.known).toBe(!before.entry?.known)

    act(() => last().onFilterChange('known'))
    expect(last().filter).toBe('known')
    const shown = last().sections.flatMap((section) => section.entries)
    expect(shown.every((candidate) => candidate.known)).toBe(true)
    expect(shown).toHaveLength(last().counts.known)

    // leave the shared stores as found
    act(() => toggleEnabled(id))
    act(() => toggleKnown(id))
  })
})

describe('LibraryPane at regular width', () => {
  it('has an inline search field instead of the native bar', () => {
    router.segments = ['(library)', 'glossary']
    router.pathname = '/glossary'
    renderScreen(<LibraryPane />, { layout: 'regular' })
    const props = last()
    expect(searchBars).toHaveLength(0)
    expect(props.selectedId).toBeNull()
    expect(props.searchable?.placeholder).toBeTruthy()
    act(() => last().searchable?.onQueryChange('zzzzqqqq'))
    expect(last().query).toBe('zzzzqqqq')
    expect(last().counts.all).toBe(0)
  })

  it('selects the open item, and the memorised one too', () => {
    router.segments = ['(library)', 'item', '[id]']
    router.pathname = '/item/abc'
    renderScreen(<LibraryPane />, { layout: 'wide' })
    expect(last().selectedId).toBe('abc')

    router.segments = ['(library)', 'item', 'memorise', '[id]']
    router.pathname = '/item/memorise/xyz'
    renderScreen(<LibraryPane />, { layout: 'wide' })
    expect(last().selectedId).toBe('xyz')
  })

  it('selects nothing while another tab has focus', () => {
    router.segments = ['(more)']
    router.pathname = '/item/abc'
    renderScreen(<LibraryPane />, { layout: 'wide' })
    expect(last().selectedId).toBeNull()
  })
})

void fireEvent
