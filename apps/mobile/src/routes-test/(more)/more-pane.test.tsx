import '../../../test/more'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { Layout } from '@ihsaanly/ui/layout'
import type { MoreGroup } from '@ihsaanly/ui/types'
import { act, render } from '@testing-library/react'
import { Stack } from 'expo-router/stack'
import type { ReactElement } from 'react'
import { last, mockScreen } from '../../../test/more'
import { LayoutHost } from '../../../test/more-host'
import { router } from '../../../test/router'

interface MoreProps {
  groups: MoreGroup[]
  searchable?: { query: string; onQueryChange: (q: string) => void; placeholder: string }
  selectedHref: string | null
}
interface SearchBarProps {
  placeholder: string
  onChangeText: (event: { nativeEvent: { text: string | null } }) => void
  onCancelButtonPress: () => void
  onClose: () => void
}
const screens = mockScreen<MoreProps>('@ihsaanly/ui/screens/more', 'MoreScreen')
const bars: SearchBarProps[] = []
// The shared expo-router fake's search bar renders nothing; for this file it records its props,
// and the previous one is put back afterwards for the files that rely on theirs.
const stack = Stack as unknown as { SearchBar: (props: SearchBarProps) => null }
const sharedSearchBar = stack.SearchBar

const { MorePane, morePath } = await import('@/more/more-pane')
const { getStrings } = await import('@ihsaanly/state/strings')

const host = (layout: Layout): ReactElement => (
  <LayoutHost layout={layout}>
    <MorePane />
  </LayoutHost>
)
const rows = (groups: MoreGroup[]): number => groups.reduce((n, g) => n + g.rows.length, 0)

beforeAll(() => {
  stack.SearchBar = (props) => {
    bars.push(props)
    return null
  }
})

afterAll(() => {
  stack.SearchBar = sharedSearchBar
})

describe('morePath', () => {
  it('is null while another tab is focused', () => {
    expect(morePath(['(library)'], '/glossary')).toBeNull()
    expect(morePath([], '/')).toBeNull()
  })

  it('is the path segments under (more)', () => {
    expect(morePath(['(more)', 'language'], '/language')).toEqual(['language'])
    expect(morePath(['(more)'], '/')).toEqual([])
  })
})

describe('MorePane', () => {
  beforeEach(() => {
    screens.length = 0
    bars.length = 0
  })

  it('uses the native search bar at compact, with no inline search', () => {
    render(host('compact'))
    expect(bars).toHaveLength(1)
    expect(bars[0]?.placeholder).toBe(getStrings().more.search)
    expect(last(screens).searchable).toBeUndefined()
    expect(last(screens).selectedHref).toBeNull()
  })

  it('filters the list from the native search bar and clears on cancel and close', () => {
    render(host('compact'))
    const all = rows(last(screens).groups)
    expect(all).toBeGreaterThan(1)

    act(() => last(bars).onChangeText({ nativeEvent: { text: 'language' } }))
    const filtered = rows(last(screens).groups)
    expect(filtered).toBeGreaterThan(0)
    expect(filtered).toBeLessThan(all)

    act(() => last(bars).onCancelButtonPress())
    expect(rows(last(screens).groups)).toBe(all)

    act(() => last(bars).onChangeText({ nativeEvent: { text: 'language' } }))
    act(() => last(bars).onClose())
    expect(rows(last(screens).groups)).toBe(all)
  })

  it('treats a null text (Android on mount and close) as empty', () => {
    render(host('compact'))
    const all = rows(last(screens).groups)
    act(() => last(bars).onChangeText({ nativeEvent: { text: null } }))
    expect(rows(last(screens).groups)).toBe(all)
  })

  it('searches inline at regular and wide instead', () => {
    for (const layout of ['regular', 'wide'] as const) {
      screens.length = 0
      bars.length = 0
      const view = render(host(layout))
      expect(bars).toEqual([])
      const searchable = last(screens).searchable
      expect(searchable?.placeholder).toBe(getStrings().more.search)
      expect(searchable?.query).toBe('')

      const all = rows(last(screens).groups)
      act(() => searchable?.onQueryChange('language'))
      expect(last(screens).searchable?.query).toBe('language')
      expect(rows(last(screens).groups)).toBeLessThan(all)
      view.unmount()
    }
  })

  it('selects the open settings row at regular and wide, never at compact', () => {
    router.segments = ['(more)', 'language']
    router.pathname = '/language'
    render(host('regular'))
    expect(last(screens).selectedHref).toBe('/language')

    screens.length = 0
    render(host('compact'))
    expect(last(screens).selectedHref).toBeNull()
  })

  it('selects nothing at the group index or from another tab', () => {
    router.segments = ['(more)']
    router.pathname = '/'
    render(host('wide'))
    expect(last(screens).selectedHref).toBeNull()

    screens.length = 0
    router.segments = ['(library)']
    router.pathname = '/glossary'
    render(host('wide'))
    expect(last(screens).selectedHref).toBeNull()
  })
})
