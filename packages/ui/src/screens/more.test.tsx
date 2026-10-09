import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { moreFixture } from './fixtures'
import { MoreScreen } from './more'

describe('MoreScreen', () => {
  it('groups rows under headings and links them', async () => {
    const { user, navigations } = renderScreen(<MoreScreen {...moreFixture} />)
    expect(screen.getByRole('heading', { name: 'Prayer' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Your practice' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: named('Location') }))
    expect(navigations).toEqual(['/location'])
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('marks the row of the open pane', () => {
    const { strings } = renderScreen(<MoreScreen {...moreFixture} selectedHref="/qada" />)
    expect(screen.getAllByLabelText(strings.calculation.selected)).toHaveLength(1)
  })

  it('searches through the host-owned query', async () => {
    const onQueryChange = mock((_query: string) => {})
    const { user, strings } = renderScreen(
      <MoreScreen
        {...moreFixture}
        searchable={{ query: '', onQueryChange, placeholder: 'Search settings' }}
      />,
    )
    const field = screen.getByRole('textbox', { name: strings.more.searchLabel })
    expect(field).toHaveAttribute('placeholder', 'Search settings')
    await user.type(field, 'q')
    expect(onQueryChange).toHaveBeenCalledWith('q')
  })

  it('says so when nothing matches', () => {
    const { strings } = renderScreen(<MoreScreen groups={[]} />)
    expect(screen.getByText(strings.library.noResults)).toBeInTheDocument()
  })
})
