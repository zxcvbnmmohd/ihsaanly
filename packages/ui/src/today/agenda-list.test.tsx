import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { AgendaList } from './agenda-list'
import { agendaListFixture } from './fixtures'

describe('AgendaList', () => {
  it('lists its entries as cards under the title, each with its own circle', async () => {
    const onCircle = mock((_id: string) => {})
    const { user, navigations, strings } = renderScreen(
      <AgendaList {...agendaListFixture} onCircle={onCircle} />,
    )
    expect(screen.getByRole('heading', { name: agendaListFixture.title })).toBeInTheDocument()
    const [entry] = agendaListFixture.entries
    if (!entry) throw new Error('fixture has no entries')
    await user.click(screen.getByRole('link', { name: strings.today.open(entry.title) }))
    expect(navigations).toEqual([entry.href])
    await user.click(
      screen.getByRole('button', { name: strings.today.partsItem(entry.title, 4, 11) }),
    )
    expect(onCircle).toHaveBeenCalledWith(entry.id)
    expect(navigations).toHaveLength(1)
  })

  it('renders nothing when empty', () => {
    const { container } = renderScreen(
      <AgendaList title="Tomorrow" entries={[]} onCircle={() => {}} />,
    )
    expect(screen.queryByText('Tomorrow')).toBeNull()
    expect(container.textContent).toBe('')
  })
})
