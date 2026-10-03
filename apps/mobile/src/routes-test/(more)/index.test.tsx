import '../../../test/more'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { MoreGroup } from '@ihsaanly/ui/types'
import { render } from '@testing-library/react'
import { Stack } from 'expo-router/stack'
import { last, mockScreen } from '../../../test/more'
import { LayoutHost } from '../../../test/more-host'

interface Props {
  groups: MoreGroup[]
  selectedHref: string | null
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/more', 'MoreScreen')

// Compact renders the native search bar, which the shared expo-router fake lacks.
const stack = Stack as unknown as { SearchBar?: () => null }
const sharedSearchBar = stack.SearchBar
beforeAll(() => {
  stack.SearchBar = () => null
})
afterAll(() => {
  stack.SearchBar = sharedSearchBar
})

const { default: MoreIndexRoute } = await import('../../app/(more)/index')

describe('more index route', () => {
  beforeEach(() => {
    renders.length = 0
  })

  it('renders the More list', () => {
    render(
      <LayoutHost layout="compact">
        <MoreIndexRoute />
      </LayoutHost>,
    )
    const hrefs = last(renders).groups.flatMap((group) => group.rows.map((row) => row.href))
    expect(hrefs).toContain('/language')
    expect(hrefs).toContain('/about')
  })
})
