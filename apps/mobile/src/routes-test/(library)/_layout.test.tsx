import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { items, resolveText } from '@ihsaanly/core/content'
import { en } from '@ihsaanly/core/strings/en'
import { fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { renderScreen } from '../../../../../packages/ui/test/render'
import '../../../test/library'
import { router } from '../../../test/router'

mock.module('@ihsaanly/ui/screens/library', () => ({
  LibraryScreen: (): ReactElement => <div data-testid="list-pane" />,
}))

const { default: LibraryLayout, unstable_settings } = await import('../../app/(library)/_layout')

const item = items[0]
const itemTitle = item ? (resolveText(item.title) ?? '') : ''

function open(segments: string[], pathname: string): void {
  router.segments = segments
  router.pathname = pathname
}

beforeEach(() => router.screens.splice(0))

it('anchors deep links on the index', () => {
  expect(unstable_settings).toEqual({ anchor: 'index' })
})

describe('compact', () => {
  it('is a stack of the list and the glossary, with no reader panel', () => {
    const { queryByTestId, queryByRole } = renderScreen(<LibraryLayout />, { layout: 'compact' })
    expect(router.screens).toEqual([{ title: en.library.title }, { title: en.glossary.title }])
    expect(queryByTestId('list-pane')).toBeNull()
    expect(queryByRole('button', { name: 'Close' })).toBeNull()
  })
})

describe('regular and wide', () => {
  it('shows only the list at the group index', () => {
    open(['(library)'], '/')
    const { getByTestId, queryByRole } = renderScreen(<LibraryLayout />, { layout: 'wide' })
    expect(getByTestId('list-pane')).toBeTruthy()
    expect(queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('shows only the list while another tab has focus', () => {
    open(['(more)'], '/language')
    const { queryByRole } = renderScreen(<LibraryLayout />, { layout: 'regular' })
    expect(queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('titles the panel for the glossary', () => {
    open(['(library)', 'glossary'], '/glossary')
    const { getByText } = renderScreen(<LibraryLayout />, { layout: 'wide' })
    expect(getByText(en.glossary.title)).toBeTruthy()
  })

  it('titles the panel for the memorise screen', () => {
    open(['(library)', 'item', 'memorise', '[id]'], '/item/memorise/x')
    const { getByText } = renderScreen(<LibraryLayout />, { layout: 'wide' })
    expect(getByText(en.memorise.title)).toBeTruthy()
  })

  it("titles the panel with the item's own title", () => {
    expect(itemTitle).not.toBe('')
    open(['(library)', 'item', '[id]'], `/item/${item?.id}`)
    const { getByText } = renderScreen(<LibraryLayout />, { layout: 'wide' })
    expect(getByText(itemTitle)).toBeTruthy()
  })

  it('titles the panel Not found for an unknown item', () => {
    open(['(library)', 'item', '[id]'], '/item/does-not-exist')
    const { getByText } = renderScreen(<LibraryLayout />, { layout: 'wide' })
    expect(getByText(en.notFound.title)).toBeTruthy()
  })

  it('falls back to the Library title for an unrecognised path', () => {
    open(['(library)', 'item'], '/item')
    const { getAllByText } = renderScreen(<LibraryLayout />, { layout: 'wide' })
    expect(getAllByText(en.library.title).length).toBeGreaterThan(0)
  })

  it('falls back to the Library title for another path under the group', () => {
    open(['(library)', 'other'], '/other')
    const { getAllByText } = renderScreen(<LibraryLayout />, { layout: 'wide' })
    expect(getAllByText(en.library.title).length).toBeGreaterThan(0)
  })

  it('closing the panel returns to the group index', () => {
    open(['(library)', 'glossary'], '/glossary')
    const { getByRole } = renderScreen(<LibraryLayout />, { layout: 'wide' })
    fireEvent.click(getByRole('button', { name: 'Close' }))
    expect(router.calls).toEqual([['replace', '/(library)']])
  })
})
