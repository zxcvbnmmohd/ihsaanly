import { beforeEach, expect, it, mock } from 'bun:test'
import type { ReactElement } from 'react'
import { renderScreen } from '../../../../../packages/ui/test/render'
import '../../../test/library'

let renders = 0
mock.module('@ihsaanly/ui/screens/library', () => ({
  LibraryScreen: (): ReactElement => {
    renders += 1
    return <div data-testid="library-screen" />
  },
}))

const { default: LibraryIndexRoute } = await import('../../app/(library)/index')

beforeEach(() => {
  renders = 0
})

it('renders the Library list pane', () => {
  const { getByTestId } = renderScreen(<LibraryIndexRoute />)
  expect(getByTestId('library-screen')).toBeTruthy()
  expect(renders).toBe(1)
})
