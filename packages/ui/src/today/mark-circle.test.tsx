import { describe, expect, it, mock } from 'bun:test'
import { act, screen } from '@testing-library/react'
import { type RenderScreenResult, renderScreen } from '../../test/render'
import type { EntryMark } from '../types'
import { MarkCircle } from './mark-circle'

const at = (mark: EntryMark, onPress = (): void => {}): RenderScreenResult =>
  renderScreen(<MarkCircle title="Tasbih" mark={mark} onPress={onPress} />)

describe('MarkCircle', () => {
  it('is an outlined button that marks the item done', async () => {
    const onPress = mock(() => {})
    const { user, strings } = at({ done: false, progress: null }, onPress)
    const circle = screen.getByRole('button', { name: strings.today.markDone('Tasbih') })
    expect(screen.queryByText('✓')).toBeNull()
    await user.click(circle)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('is filled with a tick once done, and unmarks', () => {
    const { strings } = at({ done: true, progress: { kind: 'count', value: 33, total: 33 } })
    expect(screen.getByRole('button', { name: strings.today.unmark('Tasbih') })).toBeInTheDocument()
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('shows a counted item as a ring with its count, half filled or less', () => {
    const { strings } = at({ done: false, progress: { kind: 'count', value: 12, total: 33 } })
    expect(
      screen.getByRole('button', { name: strings.today.countItem('Tasbih', 12, 33) }),
    ).toBeInTheDocument()
    expect(screen.getByText('12/33')).toBeInTheDocument()
  })

  it('shows a multi-part item as a ring past half way', () => {
    const { strings } = at({ done: false, progress: { kind: 'parts', value: 9, total: 11 } })
    expect(
      screen.getByRole('button', { name: strings.today.partsItem('Tasbih', 9, 11) }),
    ).toBeInTheDocument()
    expect(screen.getByText('9/11')).toBeInTheDocument()
  })

  it('draws an empty ring for nothing counted or nothing to count', () => {
    at({ done: false, progress: { kind: 'count', value: 0, total: 0 } })
    expect(screen.getByText('0/0')).toBeInTheDocument()
  })

  it('answers Enter and Space as its own focusable button', async () => {
    const onPress = mock(() => {})
    const { user, strings } = at({ done: false, progress: null }, onPress)
    const circle = screen.getByRole('button', { name: strings.today.markDone('Tasbih') })
    act(() => circle.focus())
    expect(circle).toHaveFocus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onPress).toHaveBeenCalledTimes(2)
  })
})
