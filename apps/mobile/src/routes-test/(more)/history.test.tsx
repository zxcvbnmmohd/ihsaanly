import '../../../test/more'
import { beforeEach, describe, expect, it } from 'bun:test'
import { items, resolveText } from '@ihsaanly/core/content'
import { act, render } from '@testing-library/react'
import { last, mockScreen } from '../../../test/more'

interface Props {
  daysActive: number
  prayers: { subject: string; count: number }[]
  items: { subject: string; count: number }[]
  labelFor: (subject: string) => string
}
const renders = mockScreen<Props>('@ihsaanly/ui/screens/history', 'HistoryScreen')

const { default: HistoryRoute } = await import('../../app/(more)/history')
const { wipe } = await import('@ihsaanly/state/storage/backend')
const { recordEvent, reloadEvents } = await import('@ihsaanly/state/storage/events')
const { getStrings } = await import('@ihsaanly/state/strings')

const at = new Date('2026-03-01T05:00:00Z')

describe('history route', () => {
  beforeEach(() => {
    renders.length = 0
    wipe()
    reloadEvents()
  })

  it('summarises prayers and items, leaving out retracted ones', () => {
    const item = items[0]
    if (!item) throw new Error('no content items')
    render(<HistoryRoute />)
    expect(last(renders).daysActive).toBe(0)

    act(() => {
      recordEvent({ kind: 'prayer-performed', subject: 'fajr', at, logDay: '2026-03-01' })
      recordEvent({ kind: 'prayer-performed', subject: 'dhuhr', at, logDay: '2026-03-01' })
      recordEvent({ kind: 'prayer-unmarked', subject: 'dhuhr', at, logDay: '2026-03-01' })
      recordEvent({ kind: 'item-completed', subject: item.id, at, logDay: '2026-03-02' })
    })

    const props = last(renders)
    expect(props.daysActive).toBe(2)
    expect(props.prayers.map((p) => [p.subject, p.count])).toEqual([['fajr', 1]])
    expect(props.items.map((p) => [p.subject, p.count])).toEqual([[item.id, 1]])
  })

  it('labels a subject as its item title, its prayer name, or itself', () => {
    const item = items[0]
    if (!item) throw new Error('no content items')
    render(<HistoryRoute />)
    const { labelFor } = last(renders)
    expect(labelFor(item.id)).toBe(resolveText(item.title) ?? item.id)
    expect(labelFor('fajr')).toBe(getStrings().prayer.fajr)
    expect(labelFor('no-such-subject')).toBe('no-such-subject')
  })
})
