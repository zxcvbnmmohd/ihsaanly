import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

import { fileSystemModule, files } from '../../../test/file-system'

mock.module('expo-file-system', fileSystemModule)
const { dropTaps, onTapRecorded, readTaps, recordTap, tapFromClick } = await import('./tap-store')
const { TAP_ACTION } = await import('./tap-action')
const android = await import('../taps.android')

beforeAll(() => mock.module('expo-file-system', fileSystemModule))
beforeEach(() => {
  files.contents.clear()
  files.unreadable = false
})

const DAY = 24 * 60 * 60_000

describe('the Android tap store', () => {
  it('starts empty, and keeps each tap recorded in order', () => {
    expect(readTaps()).toEqual([])
    recordTap({ kind: 'done', id: 'a', at: 10 })
    const kept = recordTap({ kind: 'prayer', id: 'fajr', at: 20 })
    expect(kept).toEqual([
      { kind: 'done', id: 'a', at: 10 },
      { kind: 'prayer', id: 'fajr', at: 20 },
    ])
    expect(readTaps()).toEqual(kept)
  })

  it('forgets taps two days old when another is recorded', () => {
    recordTap({ kind: 'done', id: 'old', at: 0 })
    recordTap({ kind: 'done', id: 'new', at: 3 * DAY })
    expect(readTaps().map((tap) => tap.id)).toEqual(['new'])
  })

  it('drops what the app has filed, up to and including the cursor', () => {
    recordTap({ kind: 'done', id: 'a', at: 10 })
    recordTap({ kind: 'done', id: 'b', at: 20 })
    recordTap({ kind: 'done', id: 'c', at: 30 })
    dropTaps(20)
    expect(readTaps().map((tap) => tap.id)).toEqual(['c'])
    dropTaps(20)
    expect(readTaps().map((tap) => tap.id)).toEqual(['c'])
  })

  it('reads nothing from a file it cannot read or parse, and skips what is not a tap', () => {
    files.contents.set('widget-taps.json', '{not json')
    expect(readTaps()).toEqual([])
    files.contents.set('widget-taps.json', '{"taps": []}')
    expect(readTaps()).toEqual([])
    files.contents.set(
      'widget-taps.json',
      JSON.stringify([
        { id: 'legacy', at: 1 },
        { kind: 'wave', id: 'x', at: 2 },
        { kind: 'done', id: 3, at: 3 },
        null,
        { kind: 'count', id: 'tasbih', at: 4 },
      ]),
    )
    expect(readTaps()).toEqual([
      { id: 'legacy', at: 1 },
      { kind: 'count', id: 'tasbih', at: 4 },
    ])
    files.unreadable = true
    expect(readTaps()).toEqual([])
  })

  it('tells a listener in the running app of each tap, until it unsubscribes', () => {
    let heard = 0
    const stop = onTapRecorded(() => {
      heard += 1
    })
    recordTap({ kind: 'done', id: 'a', at: 1 })
    stop()
    recordTap({ kind: 'done', id: 'b', at: 2 })
    expect(heard).toBe(1)
  })
})

describe('tapFromClick', () => {
  it('reads a mark from its click, at the moment of the click', () => {
    expect(tapFromClick(TAP_ACTION, { kind: 'prayer', id: 'asr' }, 99)).toEqual({
      kind: 'prayer',
      id: 'asr',
      at: 99,
    })
  })

  it('answers null to any other click, or data that is not a mark', () => {
    expect(tapFromClick('OPEN_URI', { kind: 'done', id: 'a' }, 1)).toBeNull()
    expect(tapFromClick(undefined, undefined, 1)).toBeNull()
    expect(tapFromClick(TAP_ACTION, undefined, 1)).toBeNull()
    expect(tapFromClick(TAP_ACTION, { kind: 'wave', id: 'a' }, 1)).toBeNull()
    expect(tapFromClick(TAP_ACTION, { kind: 'done', id: '' }, 1)).toBeNull()
    expect(tapFromClick(TAP_ACTION, { kind: 'done', id: 7 }, 1)).toBeNull()
  })
})

describe('taps.android', () => {
  it('reads, hears and forgets taps through the store', async () => {
    let heard = 0
    const stop = android.onWidgetTap(() => {
      heard += 1
    })
    recordTap({ kind: 'count', id: 'tasbih', at: 5 })
    recordTap({ kind: 'count', id: 'tasbih', at: 6 })
    expect(heard).toBe(2)
    stop()
    expect(await android.readWidgetTaps()).toHaveLength(2)
    await android.forgetWidgetTaps(5)
    expect(await android.readWidgetTaps()).toEqual([{ kind: 'count', id: 'tasbih', at: 6 }])
  })
})
