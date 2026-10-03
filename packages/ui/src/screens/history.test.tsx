import { describe, expect, it } from 'bun:test'
import { screen } from '@testing-library/react'
import { renderScreen } from '../../test/render'
import { historyFixture } from './fixtures'
import { HistoryScreen } from './history'

describe('HistoryScreen', () => {
  it('is empty before any day is active', () => {
    const { strings } = renderScreen(<HistoryScreen {...historyFixture} daysActive={0} />)
    expect(screen.getByText(strings.history.empty)).toBeInTheDocument()
  })

  it('summarises prayers and items with how early or late they typically are', () => {
    const { strings } = renderScreen(<HistoryScreen {...historyFixture} />)
    expect(screen.getByText(strings.history.daysActive(42))).toBeInTheDocument()
    expect(screen.getByText(`fajr · ${strings.history.times(38)}`)).toBeInTheDocument()
    expect(screen.getByText(strings.history.early(10))).toBeInTheDocument()
    expect(screen.getByText(strings.history.late(15))).toBeInTheDocument()
    expect(screen.getByText(`morning-adhkar · ${strings.history.times(24)}`)).toBeInTheDocument()
    expect(screen.queryByText(strings.history.firstWeek)).toBeNull()
  })

  it('explains the first week and skips empty groups and negligible offsets', () => {
    const { strings } = renderScreen(
      <HistoryScreen
        {...historyFixture}
        daysActive={3}
        prayers={[{ subject: 'fajr', count: 2, typicalOffsetSeconds: 20 }]}
        items={[]}
      />,
    )
    expect(screen.getByText(strings.history.firstWeek)).toBeInTheDocument()
    expect(screen.queryByText(strings.history.early(0))).toBeNull()
    expect(screen.queryByRole('heading', { name: strings.history.completed })).toBeNull()
  })
})
