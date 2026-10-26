import { describe, expect, it, mock } from 'bun:test'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { ownDuaFixture } from './fixtures'
import { OwnDuaScreen } from './own-dua'

describe('OwnDuaScreen', () => {
  it('is a not-found message when the dua is gone', () => {
    const { strings } = renderScreen(<OwnDuaScreen {...ownDuaFixture} dua={null} />)
    expect(screen.getByText(strings.notFound.body)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.item.done })).toBeNull()
  })

  it('shows the words as written, its moment and count, and no ruling', async () => {
    const { user, navigations, strings } = renderScreen(<OwnDuaScreen {...ownDuaFixture} />)
    const dua = ownDuaFixture.dua
    if (!dua) throw new Error('fixture has no dua')
    expect(screen.getByText(strings.myDuas.yours)).toBeInTheDocument()
    expect(screen.getByText(strings.item.repeat(3))).toBeInTheDocument()
    expect(screen.getByText(`${strings.myDuas.remind} · Evening`)).toBeInTheDocument()
    expect(screen.getByText(dua.arabic as string)).toBeInTheDocument()
    expect(screen.getByText(dua.transliteration as string)).toBeInTheDocument()
    expect(screen.getByText(dua.text as string)).toBeInTheDocument()
    expect(screen.queryByText(strings.ruling.mubah)).toBeNull()
    await user.click(screen.getByRole('link', { name: named(strings.myDuas.edit) }))
    expect(navigations).toEqual(['/my-dua?id=mine-parents'])
  })

  it('asks to delete', async () => {
    const onDelete = mock(() => {})
    const { user, strings } = renderScreen(<OwnDuaScreen {...ownDuaFixture} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: named(strings.myDuas.delete) }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('leaves out what it does not have', () => {
    const { strings } = renderScreen(
      <OwnDuaScreen
        {...ownDuaFixture}
        counter={null}
        dua={{
          title: 'Short',
          arabic: null,
          transliteration: null,
          text: 'Only words',
          repeat: 1,
          moment: null,
        }}
      />,
    )
    expect(screen.getByText('Only words')).toBeInTheDocument()
    expect(screen.queryByText(strings.item.repeat(1))).toBeNull()
    expect(screen.queryByText(/·/)).toBeNull()
  })

  it('counts, resets and marks done, then offers to undo', async () => {
    const onTapCounter = mock(() => {})
    const onResetCounter = mock(() => {})
    const onToggleDone = mock(() => {})
    const { user, strings, rerender } = renderScreen(
      <OwnDuaScreen
        {...ownDuaFixture}
        onTapCounter={onTapCounter}
        onResetCounter={onResetCounter}
        onToggleDone={onToggleDone}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'For my parents' }))
    await user.click(screen.getByRole('button', { name: strings.item.counterReset }))
    await user.click(screen.getByRole('button', { name: strings.item.done }))
    expect(onTapCounter).toHaveBeenCalledTimes(1)
    expect(onResetCounter).toHaveBeenCalledTimes(1)
    expect(onToggleDone).toHaveBeenCalledTimes(1)

    rerender(<OwnDuaScreen {...ownDuaFixture} done />)
    expect(screen.getByRole('button', { name: strings.item.undo })).toBeInTheDocument()
    expect(screen.getByText(strings.item.doneToday)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.item.counterReset })).toBeNull()
  })
})
