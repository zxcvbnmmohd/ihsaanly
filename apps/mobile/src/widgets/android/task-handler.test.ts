import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from 'bun:test'
import type { WidgetInfo, WidgetTaskHandlerProps } from 'react-native-android-widget'
import { fileSystemModule, files } from '../../../test/file-system'
import { androidWidgetModule, info, installWidgetMocks } from '../../../test/widgets'
import type { WidgetModel, WidgetTap } from '../model'
import { WIDGET_NAMES } from '../names'
import sample from '../sample.json'

const drawn: { info: WidgetInfo; model: WidgetModel }[] = []
const updates: { widgetName: string; drawn: unknown }[] = []
const failUpdates = { on: false }

function installFakes(): void {
  installWidgetMocks()
  mock.module('react-native-android-widget', () =>
    androidWidgetModule({
      requestWidgetUpdate: async (update: {
        widgetName: string
        renderWidget: (info: WidgetInfo) => unknown
      }): Promise<void> => {
        if (failUpdates.on) throw new Error('no such widget')
        updates.push({
          widgetName: update.widgetName,
          drawn: update.renderWidget(info(update.widgetName, 100, 100)),
        })
      },
    }),
  )
  mock.module('expo-file-system', fileSystemModule)
  mock.module('./render', () => ({
    representation: (widgetInfo: WidgetInfo, model: WidgetModel) => {
      drawn.push({ info: widgetInfo, model })
      return { light: 'light', dark: 'dark' }
    },
  }))
}

installFakes()
// Query-suffixed: register.android.test replaces './task-handler' for the whole run.
const handlerFile = './task-handler.tsx?actual'
const { widgetTaskHandler }: typeof import('./task-handler') = await import(handlerFile)
const { TAP_ACTION } = await import('./tap-action')
const { readTaps } = await import('./tap-store')

beforeAll(installFakes)
afterAll(() => setSystemTime())
beforeEach(() => {
  files.contents.clear()
  files.unreadable = false
  drawn.length = 0
  updates.length = 0
  failUpdates.on = false
  setSystemTime(new Date(250))
})

function entry(at: number, window: string): WidgetModel {
  return { ...structuredClone(sample), at, window }
}

function publish(timeline: WidgetModel[]): void {
  files.contents.set('widget-timeline.json', JSON.stringify(timeline))
}

async function run(
  action: WidgetTaskHandlerProps['widgetAction'],
  click: Pick<WidgetTaskHandlerProps, 'clickAction' | 'clickActionData'> = {},
): Promise<{ rendered: unknown[] }> {
  const rendered: unknown[] = []
  await widgetTaskHandler({
    widgetInfo: info('RightNowWidget', 250, 150),
    widgetAction: action,
    renderWidget: (representation) => void rendered.push(representation),
    ...click,
  })
  return { rendered }
}

describe('widgetTaskHandler', () => {
  for (const action of ['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED'] as const) {
    it(`${action} draws the entry that applies now from the published timeline`, async () => {
      publish([entry(100, 'Morning'), entry(200, 'Midday'), entry(300, 'Evening')])
      const { rendered } = await run(action)
      expect(rendered).toEqual([{ light: 'light', dark: 'dark' }])
      expect(drawn).toHaveLength(1)
      expect(drawn[0]?.model.window).toBe('Midday')
      expect(drawn[0]?.model.taps).toEqual([])
      expect(drawn[0]?.info.widgetName).toBe('RightNowWidget')
      expect(drawn[0]?.info.width).toBe(250)
    })
  }

  it('draws the sample when nothing has been published yet', async () => {
    const { rendered } = await run('WIDGET_ADDED')
    expect(rendered).toHaveLength(1)
    expect(drawn[0]?.model.window).toBe(sample.window)
  })

  it('draws the taps the app has not filed yet on every update', async () => {
    publish([entry(100, 'Morning')])
    files.contents.set('widget-taps.json', JSON.stringify([{ kind: 'done', id: 'a', at: 90 }]))
    await run('WIDGET_UPDATE')
    expect(drawn[0]?.model.taps).toEqual([{ kind: 'done', id: 'a', at: 90 }])
  })

  it('WIDGET_DELETED draws nothing', async () => {
    publish([entry(100, 'Morning')])
    const { rendered } = await run('WIDGET_DELETED')
    expect(rendered).toEqual([])
    expect(drawn).toEqual([])
  })

  it('a click that is not a mark draws nothing; links are opened natively', async () => {
    publish([entry(100, 'Morning')])
    const { rendered } = await run('WIDGET_CLICK', { clickAction: 'SOMETHING_ELSE' })
    expect(rendered).toEqual([])
    expect(readTaps()).toEqual([])
  })

  it('a mark is kept for the app and drawn at once, here and on every other widget', async () => {
    publish([entry(100, 'Morning')])
    const { rendered } = await run('WIDGET_CLICK', {
      clickAction: TAP_ACTION,
      clickActionData: { kind: 'prayer', id: 'dhuhr' },
    })
    const tap: WidgetTap = { kind: 'prayer', id: 'dhuhr', at: 250 }
    expect(readTaps()).toEqual([tap])
    expect(rendered).toEqual([{ light: 'light', dark: 'dark' }])
    expect(drawn[0]?.model.taps).toEqual([tap])
    expect(drawn[0]?.model.window).toBe('Morning')
    expect(updates.map((update) => update.widgetName)).toEqual(
      WIDGET_NAMES.filter((name) => name !== 'RightNowWidget'),
    )
    expect(drawn.every((each) => each.model.taps.length === 1)).toBe(true)
  })

  it('keeps the mark even when another widget cannot be redrawn', async () => {
    failUpdates.on = true
    const { rendered } = await run('WIDGET_CLICK', {
      clickAction: TAP_ACTION,
      clickActionData: { kind: 'count', id: 'tasbih-after-prayer' },
    })
    expect(rendered).toHaveLength(1)
    expect(readTaps()).toHaveLength(1)
  })

  it('fails loudly on an action it does not know', async () => {
    const unknown: unknown = 'WIDGET_SOMETHING'
    const action = (): Promise<void> =>
      widgetTaskHandler({
        widgetInfo: info('RightNowWidget', 250, 150),
        // @ts-expect-error the union is closed; this simulates a newer library version
        widgetAction: unknown,
        renderWidget: () => {},
      })
    await expect(action()).rejects.toThrow()
  })
})
