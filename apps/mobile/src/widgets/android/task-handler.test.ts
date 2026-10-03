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
import { info, installWidgetMocks } from '../../../test/widgets'
import type { WidgetModel } from '../model'
import sample from '../sample.json'

const disk = { content: null as string | null }
const drawn: { info: WidgetInfo; model: WidgetModel }[] = []

function installFakes(): void {
  installWidgetMocks()
  mock.module('expo-file-system', () => ({
    Paths: { document: 'file:///documents', cache: 'file:///cache' },
    File: class {
      get exists(): boolean {
        return disk.content !== null
      }
      async write(contents: string): Promise<void> {
        disk.content = contents
      }
      async text(): Promise<string> {
        return disk.content ?? ''
      }
    },
  }))
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

beforeAll(installFakes)
afterAll(() => setSystemTime())
beforeEach(() => {
  disk.content = null
  drawn.length = 0
  setSystemTime(new Date(250))
})

function entry(at: number, window: string): WidgetModel {
  return { ...structuredClone(sample), at, window }
}

async function run(
  action: WidgetTaskHandlerProps['widgetAction'],
): Promise<{ rendered: unknown[] }> {
  const rendered: unknown[] = []
  await widgetTaskHandler({
    widgetInfo: info('RightNowWidget', 250, 150),
    widgetAction: action,
    renderWidget: (representation) => void rendered.push(representation),
  })
  return { rendered }
}

describe('widgetTaskHandler', () => {
  for (const action of ['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED'] as const) {
    it(`${action} draws the entry that applies now from the published timeline`, async () => {
      disk.content = JSON.stringify([
        entry(100, 'Morning'),
        entry(200, 'Midday'),
        entry(300, 'Evening'),
      ])
      const { rendered } = await run(action)
      expect(rendered).toEqual([{ light: 'light', dark: 'dark' }])
      expect(drawn).toHaveLength(1)
      expect(drawn[0]?.model.window).toBe('Midday')
      expect(drawn[0]?.info.widgetName).toBe('RightNowWidget')
      expect(drawn[0]?.info.width).toBe(250)
    })
  }

  it('draws the sample when nothing has been published yet', async () => {
    const { rendered } = await run('WIDGET_ADDED')
    expect(rendered).toHaveLength(1)
    expect(drawn[0]?.model.window).toBe(sample.window)
  })

  for (const action of ['WIDGET_DELETED', 'WIDGET_CLICK'] as const) {
    it(`${action} draws nothing; taps are deep links handled natively`, async () => {
      disk.content = JSON.stringify([entry(100, 'Morning')])
      const { rendered } = await run(action)
      expect(rendered).toEqual([])
      expect(drawn).toEqual([])
    })
  }

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
