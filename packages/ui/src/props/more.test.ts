import { describe, expect, it } from 'bun:test'
import { en } from '@ihsaanly/core/strings/en'
import { filterGroups, type MoreGroupsInput, moreGroups, SHOW_ME_AROUND_HREF } from './more'

const baseInput: MoreGroupsInput = {
  strings: en,
  placeLabel: 'Toronto',
  asr: 'shafi',
  hijriOffset: 0,
  travelling: false,
  trackingPaused: false,
  language: 'en',
  theme: 'system',
  qadaOwed: 0,
}

describe('moreGroups', () => {
  it('falls back to "not set" when there is no place', () => {
    const groups = moreGroups({ ...baseInput, placeLabel: null })
    const location = groups[0]?.rows[0]
    expect(location?.detail).toBe(en.location.notSet)
  })

  it('reports active tracking with no caveats', () => {
    const groups = moreGroups(baseInput)
    const tracking = groups[1]?.rows.find((row) => row.href === '/tracking')
    expect(tracking?.detail).toBe(en.tracking.active)
  })

  it('joins travelling and paused caveats', () => {
    const groups = moreGroups({ ...baseInput, travelling: true, trackingPaused: true })
    const tracking = groups[1]?.rows.find((row) => row.href === '/tracking')
    expect(tracking?.detail).toBe([en.tracking.travelling, en.tracking.paused].join(', '))
  })

  it('shows no qada owed when nothing is outstanding', () => {
    const groups = moreGroups(baseInput)
    const qada = groups[2]?.rows.find((row) => row.href === '/qada')
    expect(qada?.detail).toBe(en.qada.none)
  })

  it('summarises qada owed when there is a debt', () => {
    const groups = moreGroups({ ...baseInput, qadaOwed: 4 })
    const qada = groups[2]?.rows.find((row) => row.href === '/qada')
    expect(qada?.detail).toBe(en.qada.summary(4))
  })
})

describe('the Help group', () => {
  it('ends the list with Show me around, which restarts the tour on Today', () => {
    const help = moreGroups(baseInput).at(-1)
    expect(help?.title).toBe(en.more.help)
    expect(help?.rows).toEqual([
      { href: SHOW_ME_AROUND_HREF, title: en.more.showMeAround, detail: null },
    ])
    expect(SHOW_ME_AROUND_HREF).toBe('/today?tour=1')
  })
})

describe('filterGroups', () => {
  it('returns every group unchanged for an empty query', () => {
    const groups = moreGroups(baseInput)
    expect(filterGroups(groups, '')).toEqual(groups)
  })

  it('drops rows and empty groups that do not match', () => {
    const groups = moreGroups(baseInput)
    const filtered = filterGroups(groups, 'language')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.rows).toHaveLength(1)
    expect(filtered[0]?.rows[0]?.title).toBe(en.language.title)
  })

  it('shows the Account row only when the host has a cloud', () => {
    const hrefs = (input: MoreGroupsInput): string[] =>
      moreGroups(input).flatMap((group) => group.rows.map((row) => row.href))
    expect(hrefs(baseInput)).not.toContain('/account')
    expect(hrefs({ ...baseInput, accountDetail: 'Not signed in' })).toContain('/account')
    expect(hrefs(baseInput)).not.toContain('/feedback')
    expect(hrefs({ ...baseInput, accountDetail: 'Not signed in' })).toContain('/feedback')
  })
})
