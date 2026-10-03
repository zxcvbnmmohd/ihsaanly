/// <reference path="../../../packages/ui/test/jest-dom.d.ts" />
// Renders the companion's real route tree in a memory router, the way
// src/main.tsx mounts it in a browser: SafeAreaProvider > RouterProvider.
// The root route supplies its own WebUiProvider. Needs the DOM from the
// ui preload (bunfig.toml).
import type { Place } from '@ihsaanly/core/location/place'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, type RenderResult, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import type { router as appRouter } from '../src/router'
import { routeTree } from '../src/routeTree.gen'

/** The same type the app's own router has: this is its route tree. */
export type AppRouter = typeof appRouter

export interface RenderedApp extends RenderResult {
  router: AppRouter
  user: ReturnType<typeof userEvent.setup>
}

function makeRouter(url: string): AppRouter {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [url] }),
    defaultPreload: 'intent',
  })
}

/**
 * Sets the window width react-native-web's useWindowDimensions reads (it
 * measures the visual viewport, or the document element where there is none;
 * routes/_more/more.tsx reads window.innerWidth):
 * compact below 768, regular from 768, wide from 1100.
 */
export function setWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width })
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: width,
  })
  const viewport = window.visualViewport
  if (viewport) {
    Object.defineProperty(viewport, 'width', { configurable: true, value: width })
    Object.defineProperty(viewport, 'scale', { configurable: true, value: 1 })
  }
  ;(viewport ?? window).dispatchEvent(new Event('resize'))
}

/** Mounts the app at `url` and waits for the first navigation to settle. */
export async function renderApp(url: string): Promise<RenderedApp> {
  const router = makeRouter(url)
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  let result: RenderResult | undefined
  // biome-ignore lint/nursery/useAwaitThenable: an async act() returns a promise.
  await act(async () => {
    result = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          // biome-ignore lint/plugin: safe-area-context's own (physical) inset shape.
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}>
        <RouterProvider router={router} />
      </SafeAreaProvider>,
    )
    await router.load()
  })
  return { ...(result as RenderResult), router, user }
}

export const LONDON: Place = {
  label: 'London, England, United Kingdom',
  latitude: 51.5074,
  longitude: -0.1278,
  timeZone: 'Europe/London',
  source: 'city',
}

/** An empty database, no cached values and a default (compact) window, whatever an earlier test left. */
export async function resetApp(): Promise<void> {
  const { wipe } = await import('@ihsaanly/state/storage/backend')
  const { reloadEvents } = await import('@ihsaanly/state/storage/events')
  const { forgetFailures } = await import('@ihsaanly/state/storage/log')
  const { reloadPreferences } = await import('@ihsaanly/state/storage/preference-store')
  wipe()
  reloadPreferences()
  forgetFailures()
  reloadEvents()
  window.localStorage.clear()
  setWidth(390)
}

/** Onboarding done, with a place, as someone who uses the app every day. */
export async function startUsing(
  options: { place?: Place | null; completedAt?: string } = {},
): Promise<void> {
  const { setOnboarding } = await import('@ihsaanly/state/onboarding/store')
  const { setPlace } = await import('@ihsaanly/state/location/store')
  setOnboarding({
    completed: true,
    gender: 'unspecified',
    completedAt: options.completedAt ?? new Date().toISOString(),
  })
  const place = options.place === undefined ? LONDON : options.place
  if (place) setPlace(place)
}
