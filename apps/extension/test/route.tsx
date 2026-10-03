/// <reference path="../../../packages/ui/test/jest-dom.d.ts" />
// Renders the popup's real route tree on an in-memory history, inside the
// providers main.tsx uses, over the real (localStorage-backed) stores.
import { en } from '@ihsaanly/core/strings/en'
import { chooseLanguage } from '@ihsaanly/state/i18n/store'
import { wipe } from '@ihsaanly/state/storage/backend'
import { reloadEvents } from '@ihsaanly/state/storage/events'
import { reloadPreferences } from '@ihsaanly/state/storage/preference-store'
import {
  type AnyRouter,
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { act, type RenderResult, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act as reactAct } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { routeTree } from '../src/routeTree.gen'
import { setThemePreference } from '../src/theme/store'
import { fakeChrome } from './chrome'

export { en as strings }

/** A fresh install: no stored events or preferences, English, a clean fake `chrome`. */
export function resetApp(): void {
  wipe()
  localStorage.clear()
  fakeChrome.reset()
  act(() => {
    reloadEvents()
    reloadPreferences()
    chooseLanguage('en')
    setThemePreference('system')
  })
}

const NO_INSETS = {
  frame: { x: 0, y: 0, width: 390, height: 600 },
  // biome-ignore lint/plugin: safe-area-context's own (physical) inset shape.
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

/** React's async act: lets the router load and effects run before the test looks. */
export function settle(work: () => Promise<void>): Promise<void> {
  return reactAct(work)
}

function testRouter(entries: string[]): AnyRouter {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: entries, initialIndex: entries.length - 1 }),
  })
}

export interface RouteView extends RenderResult {
  router: AnyRouter
  user: ReturnType<typeof userEvent.setup>
}

/** `path` is the page to open; a list is a history, opened on its last entry (so Back has somewhere to go). */
export async function renderRoute(path: string | string[]): Promise<RouteView> {
  const entries = [path].flat()
  const router = testRouter(entries)
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  let result!: RenderResult
  await settle(async () => {
    result = render(
      <SafeAreaProvider initialMetrics={NO_INSETS}>
        <RouterProvider router={router} />
      </SafeAreaProvider>,
    )
  })
  return { ...result, router, user }
}
