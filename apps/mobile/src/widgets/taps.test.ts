import { describe, expect, it, mock } from 'bun:test'

import { installWidgetMocks, interactions } from '../../test/widgets'

// The widgets with buttons, as taps.ios.ts reads them: each widget's stored
// timeline, or a failure for one whose App Group cannot be read.
const timelines: Record<string, unknown[] | Error> = {}

const INTERACTIVE = ['right-now', 'prayers', 'up-next', 'quick-duas', 'dua-of-the-day']
for (const name of INTERACTIVE) {
  mock.module(`./ios/${name}-widget`, () => ({
    default: {
      updateTimeline: () => {},
      getTimeline: async (): Promise<unknown[]> => {
        const timeline = timelines[name] ?? []
        if (timeline instanceof Error) throw timeline
        return timeline
      },
    },
  }))
}
installWidgetMocks()

// Query-suffixed: drain.test replaces './taps' for the whole run.
const baseFile = './taps.ts?actual'
const base: typeof import('./taps') = await import(baseFile)
const iosFile = './taps.ios.ts?actual'
const ios: typeof import('./taps.ios') = await import(iosFile)

describe('taps where widgets have no buttons', () => {
  it('has none, hears none and forgets nothing', async () => {
    expect(await base.readWidgetTaps()).toEqual([])
    const stop = base.onWidgetTap(() => {})
    stop()
    await base.forgetWidgetTaps(1)
  })
})

describe('taps on iOS', () => {
  it('reads every interactive widget’s taps, and skips one that cannot be read', async () => {
    timelines['right-now'] = [
      { date: new Date(0), props: { taps: [{ kind: 'done', id: 'a', at: 1 }] } },
      { date: new Date(1), props: {} },
    ]
    timelines.prayers = [
      { date: new Date(0), props: { taps: [{ kind: 'prayer', id: 'asr', at: 2 }] } },
    ]
    timelines['up-next'] = new Error('no app group')
    timelines['quick-duas'] = [{ date: new Date(0), props: { taps: 'not a list' } }]
    expect(await ios.readWidgetTaps()).toEqual([
      { kind: 'done', id: 'a', at: 1 },
      { kind: 'prayer', id: 'asr', at: 2 },
    ])
  })

  it('hears a press while the app runs, until it unsubscribes', () => {
    let heard = 0
    const stop = ios.onWidgetTap(() => {
      heard += 1
    })
    const removed = interactions.removed
    interactions.listeners.forEach((listener) => listener())
    stop()
    expect(heard).toBe(1)
    expect(interactions.removed).toBe(removed + 1)
  })

  it('has nothing to forget: a republish carries only what is waiting', async () => {
    await ios.forgetWidgetTaps(1)
  })
})
