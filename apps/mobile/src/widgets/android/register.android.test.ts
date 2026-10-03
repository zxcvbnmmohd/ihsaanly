import { expect, it, mock } from 'bun:test'

import { androidWidgetModule } from '../../../test/widgets'

const registered: unknown[] = []
const handler = async () => {}

mock.module('react-native-android-widget', () =>
  androidWidgetModule({ registerWidgetTaskHandler: (fn: unknown) => registered.push(fn) }),
)
mock.module('./task-handler', () => ({ widgetTaskHandler: handler }))

it('registers the widget task handler when imported', async () => {
  await import('./register.android')
  expect(registered).toEqual([handler])
})
