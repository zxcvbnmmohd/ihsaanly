import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { act, render } from '@testing-library/react'
import { last, mockScreen } from '../../../test/more'

interface Row {
  prayer: Prayer
  outstanding: number
  owed: number
  pending: number
}
interface Props {
  rows: Row[]
  onOwedChange: (prayer: Prayer, count: number) => void
  onPendingChange: (prayer: Prayer, value: number) => void
  onRecord: (prayer: Prayer) => void
  fasts: { outstanding: number; owed: number }
  onFastsOwedChange: (count: number) => void
  onRecordFastMadeUp: () => void
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/qada', 'QadaScreen')

const { default: QadaRoute } = await import('../../app/(more)/qada')
const { wipe } = await import('@ihsaanly/state/storage/backend')
const { allActions, reloadEvents } = await import('@ihsaanly/state/storage/events')
const { recordFastOwed } = await import('@ihsaanly/state/fasting/store')
const { setBacklog } = await import('@ihsaanly/state/prayer/backlog-store')
const { setPlace } = await import('@ihsaanly/state/location/store')

const row = (prayer: Prayer): Row => {
  const found = last(renders).rows.find((r) => r.prayer === prayer)
  if (!found) throw new Error(`no row for ${prayer}`)
  return found
}
const kinds = (kind: string): number => allActions().filter((a) => a.kind === kind).length

describe('qada route', () => {
  beforeEach(() => {
    renders.length = 0
    wipe()
    reloadEvents()
    setPlace(null)
    for (const r of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as Prayer[]) setBacklog(r, 0)
  })

  it('has a row per prayer', () => {
    render(<QadaRoute />)
    expect(last(renders).rows.length).toBeGreaterThan(0)
    expect(last(renders).rows.every((r) => r.pending === 0 && r.owed === 0)).toBe(true)
  })

  it('stores the owed backlog', () => {
    render(<QadaRoute />)
    act(() => last(renders).onOwedChange('asr', 4))
    expect(row('asr').owed).toBe(4)
  })

  it('records nothing for a prayer with no pending count', () => {
    render(<QadaRoute />)
    act(() => last(renders).onRecord('asr'))
    expect(kinds('prayer-made-up')).toBe(0)
  })

  it('records the pending count as made up, then clears it', () => {
    setPlace({
      label: 'Leeds',
      latitude: 53.8,
      longitude: -1.55,
      timeZone: 'Europe/London',
      source: 'city',
    })
    render(<QadaRoute />)
    act(() => last(renders).onPendingChange('asr', 3))
    expect(row('asr').pending).toBe(3)
    act(() => last(renders).onRecord('asr'))
    expect(kinds('prayer-made-up')).toBe(3)
    expect(row('asr').pending).toBe(0)
  })

  it('records with no place too', () => {
    render(<QadaRoute />)
    act(() => last(renders).onPendingChange('fajr', 1))
    act(() => last(renders).onRecord('fajr'))
    expect(kinds('prayer-made-up')).toBe(1)
  })

  it('stores the owed fasts', () => {
    render(<QadaRoute />)
    act(() => last(renders).onFastsOwedChange(6))
    expect(last(renders).fasts.owed).toBe(6)
    act(() => last(renders).onFastsOwedChange(0))
  })

  it('records a fast made up only while one is outstanding', () => {
    render(<QadaRoute />)
    expect(last(renders).fasts.outstanding).toBe(0)
    const before = allActions().length
    act(() => last(renders).onRecordFastMadeUp())
    expect(allActions()).toHaveLength(before)

    act(() => recordFastOwed(new Date('2026-03-01T12:00:00Z'), 'UTC'))
    expect(last(renders).fasts.outstanding).toBe(1)
    act(() => last(renders).onRecordFastMadeUp())
    expect(allActions().length).toBeGreaterThan(before + 1)
    expect(last(renders).fasts.outstanding).toBe(0)
  })
})
