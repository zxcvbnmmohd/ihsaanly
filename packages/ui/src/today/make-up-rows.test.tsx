import { describe, expect, it, mock } from 'bun:test'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { screen } from '@testing-library/react'
import { named, renderScreen } from '../../test/render'
import { makeUpRowsFixture } from './fixtures'
import { MakeUpRows } from './make-up-rows'

const base = { ...makeUpRowsFixture, fastsOwed: 0, fastingToday: null }

describe('MakeUpRows', () => {
  it('lists each unequal qada prayer to press, then the manage link', async () => {
    const onMakeUp = mock((_prayer: Prayer) => {})
    const { user, navigations, strings } = renderScreen(
      <MakeUpRows
        {...base}
        qada={[
          { prayer: 'fajr', count: 2 },
          { prayer: 'asr', count: 5 },
        ]}
        onMakeUp={onMakeUp}
      />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.prayer.asr) }))
    expect(onMakeUp).toHaveBeenCalledWith('asr')
    expect(screen.getByText(strings.plan.outstanding(2))).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: named(strings.qada.manage) }))
    expect(navigations).toEqual([base.qadaHref])
  })

  it('folds equal counts into one summary row', () => {
    const { strings } = renderScreen(
      <MakeUpRows
        {...base}
        qada={[
          { prayer: 'fajr', count: 2 },
          { prayer: 'dhuhr', count: 2 },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: named(strings.qada.summary(4)) })).toBeInTheDocument()
    expect(screen.getByText(`${strings.prayer.fajr}, ${strings.prayer.dhuhr}`)).toBeInTheDocument()
  })

  it('does not fold a single prayer', () => {
    const { strings } = renderScreen(<MakeUpRows {...base} qada={[{ prayer: 'fajr', count: 1 }]} />)
    expect(screen.getByRole('button', { name: named(strings.prayer.fajr) })).toBeInTheDocument()
  })

  it('shows nothing owed as nothing', () => {
    const { container } = renderScreen(<MakeUpRows {...base} qada={[]} />)
    expect(container.textContent).toBe('')
  })

  it('links the fasts owed', () => {
    const { strings } = renderScreen(<MakeUpRows {...base} qada={[]} fastsOwed={3} />)
    expect(screen.getByRole('link', { name: strings.fasting.summary(3) })).toBeInTheDocument()
  })

  it('offers to note not fasting in Ramadan', async () => {
    const onRecordFastOwed = mock(() => {})
    const { user, strings } = renderScreen(
      <MakeUpRows
        {...base}
        qada={[]}
        fastingToday={{ recorded: false }}
        onRecordFastOwed={onRecordFastOwed}
      />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.fasting.notFastingToday) }))
    expect(onRecordFastOwed).toHaveBeenCalledTimes(1)
  })

  it('offers to undo once noted', async () => {
    const onUndoFastOwed = mock(() => {})
    const { user, strings } = renderScreen(
      <MakeUpRows
        {...base}
        qada={[]}
        fastingToday={{ recorded: true }}
        onUndoFastOwed={onUndoFastOwed}
      />,
    )
    await user.click(screen.getByRole('button', { name: named(strings.fasting.recordedToday) }))
    expect(onUndoFastOwed).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText(strings.calculation.selected)).toBeInTheDocument()
  })
})
