import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import type { TodayEntry } from '../screens/today'
import { DoneSection } from './done-section'

const done: TodayEntry[] = [
  {
    id: 'a',
    title: 'Morning adhkar',
    detail: null,
    href: '/item/a',
    mark: { done: true, progress: null },
  },
  {
    id: 'b',
    title: 'Tasbih',
    detail: null,
    href: '/item/b',
    mark: { done: true, progress: { kind: 'count', value: 33, total: 33 } },
  },
]

describe('DoneSection', () => {
  it('is folded by default with its count, and unfolds to unmark', async () => {
    const onCircle = mock((_id: string) => {})
    const { user, strings } = renderScreen(<DoneSection entries={done} onCircle={onCircle} />)
    const toggle = screen.getByRole('button', { name: strings.today.doneToday(2) })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Morning adhkar')).toBeNull()
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: strings.today.unmark('Tasbih') }))
    expect(onCircle).toHaveBeenCalledWith('b')
    await user.click(toggle)
    expect(screen.queryByText('Morning adhkar')).toBeNull()
  })

  it('renders nothing when nothing is done yet', () => {
    const { container } = renderScreen(<DoneSection entries={[]} onCircle={() => {}} />)
    expect(container.textContent).toBe('')
  })
})
