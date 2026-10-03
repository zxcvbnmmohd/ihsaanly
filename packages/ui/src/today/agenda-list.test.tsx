import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { AgendaList } from './agenda-list'
import { agendaListFixture } from './fixtures'

describe('AgendaList', () => {
  it('lists its entries as links under the title', async () => {
    const { user, navigations } = renderScreen(<AgendaList {...agendaListFixture} />)
    expect(screen.getByRole('heading', { name: agendaListFixture.title })).toBeInTheDocument()
    const [entry] = agendaListFixture.entries
    if (!entry) throw new Error('fixture has no entries')
    await user.click(screen.getByRole('link', { name: named(entry.title) }))
    expect(navigations).toEqual([entry.href])
    expect(screen.getByText(entry.detail as string)).toBeInTheDocument()
  })

  it('renders nothing when empty', () => {
    const { container } = renderScreen(<AgendaList title="Tomorrow" entries={[]} />)
    expect(screen.queryByText('Tomorrow')).toBeNull()
    expect(container.textContent).toBe('')
  })
})
