import { afterAll, beforeEach, describe, expect, it, mock, setSystemTime } from 'bun:test'

import { androidWidgetModule } from '../../test/widgets'
import type { WidgetModel } from './model'
import { WIDGET_NAMES } from './names'

const updates: { widgetName: string; renderWidget: (info: unknown) => unknown }[] = []
const files = { written: [] as string[], failWrite: false }

mock.module('react-native-android-widget', () =>
  androidWidgetModule({
    requestWidgetUpdate: async (update: (typeof updates)[number]) => {
      updates.push(update)
    },
  }),
)
mock.module('./android/render', () => ({
  representation: (info: unknown, model: WidgetModel) => ({ info, at: model.at }),
}))
mock.module('expo-file-system', () => ({
  Paths: { document: 'file:///documents', cache: 'file:///cache' },
  File: class {
    exists = true
    constructor(
      readonly dir: string,
      readonly name: string,
    ) {}
    async write(contents: string): Promise<void> {
      if (files.failWrite) throw new Error('disk full')
      files.written.push(contents)
    }
    async text(): Promise<string> {
      return files.written.at(-1) ?? ''
    }
  },
}))

const { publishTimeline } = await import('./publish.android')

const entry = (at: number): WidgetModel => ({ at }) as unknown as WidgetModel

beforeEach(() => {
  updates.length = 0
  files.written = []
  files.failWrite = false
})
afterAll(() => setSystemTime())

describe('publishTimeline (Android)', () => {
  it('persists the day for the headless task, then redraws every widget with the current entry', async () => {
    setSystemTime(new Date(5_000))
    const timeline = [entry(1_000), entry(4_000), entry(9_000)]
    await publishTimeline(timeline)

    expect(JSON.parse(files.written[0] ?? '[]')).toEqual(timeline)
    expect(updates.map((update) => update.widgetName)).toEqual([...WIDGET_NAMES])
    // The entry that has begun by now, not the first and not the last.
    expect(updates[0]?.renderWidget({ id: 7 })).toEqual({ info: { id: 7 }, at: 4_000 })
  })

  it('does not redraw anything if the timeline could not be saved', async () => {
    files.failWrite = true
    await expect(publishTimeline([entry(1)])).rejects.toThrow('disk full')
    expect(updates).toEqual([])
  })
})
