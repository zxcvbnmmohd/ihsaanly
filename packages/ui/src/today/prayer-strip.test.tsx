import { describe, expect, it, mock } from 'bun:test'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { act, fireEvent, screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { prayerStripFixture } from './fixtures'
import { PrayerStrip } from './prayer-strip'

describe('PrayerStrip', () => {
  it('shows five checkboxes carrying done state and marks the one pressed', async () => {
    const onMark = mock((_prayer: Prayer) => {})
    const { user } = renderScreen(<PrayerStrip {...prayerStripFixture} onMark={onMark} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(5)
    const fajr = screen.getByRole('checkbox', { name: prayerStripFixture.names.fajr })
    const asr = screen.getByRole('checkbox', { name: prayerStripFixture.names.asr })
    expect(fajr).toHaveAttribute('aria-checked', 'true')
    expect(asr).toHaveAttribute('aria-checked', 'false')
    await user.click(asr)
    expect(onMark).toHaveBeenCalledWith('asr')
  })

  it('shows a tick only on the done prayers, and a passed unmarked one apart', () => {
    renderScreen(
      <PrayerStrip
        {...prayerStripFixture}
        prayers={[
          { prayer: 'fajr', done: true, passed: true },
          { prayer: 'dhuhr', done: false, passed: true },
        ]}
      />,
      { scheme: 'dark' },
    )
    expect(screen.getAllByText('✓')).toHaveLength(1)
  })
})

describe('PrayerStrip keyboard', () => {
  it('marks a focused prayer on Space, once per press, and on Enter', async () => {
    const onMark = mock((_prayer: Prayer) => {})
    const { user } = renderScreen(<PrayerStrip {...prayerStripFixture} onMark={onMark} />)
    const isha = screen.getByRole('checkbox', { name: prayerStripFixture.names.isha })
    act(() => isha.focus())
    expect(isha).toHaveFocus()
    await user.keyboard(' ')
    expect(onMark).toHaveBeenCalledTimes(1)
    expect(onMark).toHaveBeenLastCalledWith('isha')
    await user.keyboard('{Enter}')
    expect(onMark).toHaveBeenCalledTimes(2)
  })

  it('keeps Space from scrolling, ignores key repeat and other keys', () => {
    const onMark = mock((_prayer: Prayer) => {})
    renderScreen(<PrayerStrip {...prayerStripFixture} onMark={onMark} />)
    const asr = screen.getByRole('checkbox', { name: prayerStripFixture.names.asr })
    expect(fireEvent.keyDown(asr, { key: ' ' })).toBe(false)
    expect(fireEvent.keyDown(asr, { key: ' ', repeat: true })).toBe(false)
    expect(fireEvent.keyDown(asr, { key: 'a' })).toBe(true)
    expect(onMark).toHaveBeenCalledTimes(1)
  })
})

describe('PrayerStrip fixture', () => {
  it('has a handler that does nothing', async () => {
    const { user } = renderScreen(<PrayerStrip {...prayerStripFixture} />)
    await user.click(screen.getAllByRole('checkbox')[0] as HTMLElement)
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
  })
})
