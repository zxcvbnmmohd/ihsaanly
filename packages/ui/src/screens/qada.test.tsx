import { describe, expect, it, mock } from 'bun:test'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { qadaFixture } from './fixtures'
import { QadaScreen } from './qada'

describe('QadaScreen', () => {
  it('shows what is outstanding per prayer and for fasts', () => {
    const { strings } = renderScreen(<QadaScreen {...qadaFixture} />)
    expect(screen.getByText(strings.qada.intro)).toBeInTheDocument()
    expect(screen.getByText(strings.qada.outstanding(12))).toBeInTheDocument()
    expect(screen.getByText(strings.qada.none)).toBeInTheDocument()
    expect(screen.getByText(strings.fasting.outstanding(4))).toBeInTheDocument()
  })

  it('nudges owed and made-up counts and records a pending batch', async () => {
    const onOwedChange = mock((_prayer: Prayer, _value: number) => {})
    const onPendingChange = mock((_prayer: Prayer, _value: number) => {})
    const onRecord = mock((_prayer: Prayer) => {})
    const { user, strings } = renderScreen(
      <QadaScreen
        {...qadaFixture}
        onOwedChange={onOwedChange}
        onPendingChange={onPendingChange}
        onRecord={onRecord}
      />,
    )
    const [owedPlus] = screen.getAllByRole('button', { name: `${strings.qada.owed} +` })
    const [pendingPlus] = screen.getAllByRole('button', { name: `${strings.qada.madeUp} +` })
    await user.click(owedPlus as HTMLElement)
    await user.click(pendingPlus as HTMLElement)
    expect(onOwedChange).toHaveBeenCalledWith('fajr', 11)
    expect(onPendingChange).toHaveBeenCalledWith('fajr', 3)
    await user.click(screen.getByRole('button', { name: strings.qada.record(2) }))
    expect(onRecord).toHaveBeenCalledWith('fajr')
    // Only the prayer with something pending offers to record it.
    expect(screen.queryByRole('button', { name: strings.qada.record(0) })).toBeNull()
  })

  it('adjusts fasts owed and records one made up', async () => {
    const onFastsOwedChange = mock((_value: number) => {})
    const onRecordFastMadeUp = mock(() => {})
    const { user, strings } = renderScreen(
      <QadaScreen
        {...qadaFixture}
        onFastsOwedChange={onFastsOwedChange}
        onRecordFastMadeUp={onRecordFastMadeUp}
      />,
    )
    // The fasts card follows the two prayer cards, so its stepper is the last.
    await user.click(
      screen.getAllByRole('button', { name: `${strings.fasting.owed} +` }).at(-1) as HTMLElement,
    )
    expect(onFastsOwedChange).toHaveBeenCalledWith(4)
    await user.click(screen.getByRole('button', { name: strings.fasting.recordMadeUp }))
    expect(onRecordFastMadeUp).toHaveBeenCalledTimes(1)
  })

  it('cannot record a fast when none is outstanding', async () => {
    const onRecordFastMadeUp = mock(() => {})
    const { user, strings } = renderScreen(
      <QadaScreen
        {...qadaFixture}
        fasts={{ outstanding: 0, owed: 0 }}
        onRecordFastMadeUp={onRecordFastMadeUp}
      />,
    )
    expect(screen.getAllByText(strings.fasting.none)).not.toHaveLength(0)
    await user.click(screen.getByRole('button', { name: strings.fasting.recordMadeUp }))
    expect(onRecordFastMadeUp).not.toHaveBeenCalled()
  })
})
