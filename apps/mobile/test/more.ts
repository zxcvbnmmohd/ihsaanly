/**
 * Native packages that cannot load under Bun and that the (more) routes, the
 * root layout and More pane pull in transitively. Import this first.
 */
import { mock } from 'bun:test'
import { act } from '@testing-library/react'
import { Appearance } from 'react-native'
import { expoRouter } from './router'

// The first mock of a module fixes its export list for the whole process, so this one
// is a superset (and every later `expo` mock here spreads it). Mocks of `expo` keep its real exports: other modules (theme-override, the
// Expo packages) read `requireOptionalNativeModule` and friends from it.
// Imported by path with a query so it is the real module even when another
// test file has already replaced `expo` with a thin stand-in.
const loadedExpo = await import(`${Bun.resolveSync('expo', import.meta.dir)}?real`)
// Under Bun the real package has no `requireOptionalNativeModule`, which the
// theme-override module needs; no native module is the honest answer here.
const realExpo = { requireOptionalNativeModule: () => null, ...loadedExpo }
mock.module('expo', () => realExpo)

// `Platform.select({ ios: Color.ios.x, android: Color.android.dynamic.y })`
// builds both branches, so the fake expo-router `Color` needs an android side.
const dynamicColors = new Proxy({}, { get: (_target, key) => String(key) })
Object.assign(expoRouter.Color, { android: { dynamic: dynamicColors } })

// react-native-web has no `Appearance.setColorScheme`, which applyThemePreference calls.
const appearance = Appearance as unknown as { setColorScheme?: (scheme: unknown) => void }
appearance.setColorScheme ??= () => {}

mock.module('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: () => {},
    hasPlayServices: async () => true,
    signIn: async () => ({ type: 'cancelled' }),
  },
  GoogleSigninButton: Object.assign(() => null, {
    Size: { Wide: 1 },
    Color: { Dark: 0, Light: 1 },
  }),
}))

/**
 * Replaces a `@ihsaanly/ui` screen with a component that records the props it
 * is given. Returns the capture array; the last entry is the latest render.
 */
export function mockScreen<P>(module: string, exportName: string): P[] {
  const renders: P[] = []
  mock.module(module, () => ({
    [exportName]: (props: P): null => {
      renders.push(props)
      return null
    },
  }))
  return renders
}

export function last<T>(items: T[]): T {
  const item = items.at(-1)
  if (item === undefined) throw new Error('nothing rendered')
  return item
}

export interface LocationNative {
  foreground: { granted: boolean }
  background: { granted: boolean }
  /** Resolved by `getLastKnownPositionAsync`; null means no recent fix. */
  lastKnown: { coords: { latitude: number; longitude: number } } | null
  current: { coords: { latitude: number; longitude: number } } | Error
  address: { city?: string; region?: string; country?: string } | Error
  registered: boolean
  started: unknown[][]
  stopped: string[]
  tasks: Record<string, (body: { data?: unknown; error?: unknown }) => Promise<void>>
}

/**
 * expo-location and expo-task-manager, as controllable state. Call from the
 * test file (before importing the code under test) so the mock is this file's
 * own; mock.module is process-wide and other files install theirs.
 */
export function mockLocationNative(): LocationNative {
  const state: LocationNative = {
    foreground: { granted: true },
    background: { granted: true },
    lastKnown: null,
    current: { coords: { latitude: 51.5, longitude: -0.12 } },
    address: { city: 'London', region: 'England', country: 'UK' },
    registered: true,
    started: [],
    stopped: [],
    tasks: {},
  }
  mock.module('expo-location', () => ({
    Accuracy: { Low: 2 },
    GeofencingEventType: { Enter: 1, Exit: 2 },
    requestForegroundPermissionsAsync: async () => state.foreground,
    requestBackgroundPermissionsAsync: async () => state.background,
    startGeofencingAsync: async (...args: unknown[]) => void state.started.push(args),
    stopGeofencingAsync: async (name: string) => void state.stopped.push(name),
    getLastKnownPositionAsync: async () => state.lastKnown,
    getCurrentPositionAsync: async () => {
      if (state.current instanceof Error) throw state.current
      return state.current
    },
    reverseGeocodeAsync: async () => {
      if (state.address instanceof Error) throw state.address
      return [state.address]
    },
  }))
  mock.module('expo-task-manager', () => ({
    defineTask: (name: string, task: LocationNative['tasks'][string]) => {
      state.tasks[name] = task
    },
    isTaskRegisteredAsync: async () => state.registered,
  }))
  return state
}

export interface ShareNative {
  sharingAvailable: boolean
  shared: string[]
  /** Contents written through `new File(Paths.cache, name).write()`, by file name. */
  written: Record<string, string>
  deleted: string[]
  deleteThrows: boolean
  /** What the picked file reads as, and how big it claims to be. */
  picked: { size: number | null; text: string; throws: boolean }
  /** Resolved by DocumentPicker.getDocumentAsync; a function to reject. */
  pick: () => Promise<{ canceled: boolean; assets?: { uri: string }[] }>
  reloads: string[]
}

/**
 * expo-file-system, expo-sharing, expo-document-picker, expo-device and `expo`
 * as controllable state, for the Data and Diagnostics routes (through the real
 * `@/data/export`). Call from the test file before importing the code.
 */
export function mockShareNative(): ShareNative {
  const state: ShareNative = {
    sharingAvailable: true,
    shared: [],
    written: {},
    deleted: [],
    deleteThrows: false,
    picked: { size: 10, text: '', throws: false },
    pick: async () => ({ canceled: false, assets: [{ uri: 'file:///picked.json' }] }),
    reloads: [],
  }
  class FakeFile {
    uri: string
    constructor(base: unknown, name?: string) {
      this.uri = name ? `file:///cache/${name}` : String(base)
    }
    get size(): number | null {
      return state.picked.size
    }
    textSync(): string {
      if (state.picked.throws) throw new Error('unreadable')
      return state.picked.text
    }
    async write(contents: string): Promise<void> {
      state.written[this.uri.split('/').at(-1) ?? this.uri] = contents
    }
    delete(): void {
      if (state.deleteThrows) throw new Error('busy')
      state.deleted.push(this.uri)
    }
  }
  mock.module('expo-file-system', () => ({ File: FakeFile, Paths: { cache: 'file:///cache' } }))
  mock.module('expo-sharing', () => ({
    isAvailableAsync: async () => state.sharingAvailable,
    shareAsync: async (uri: string) => void state.shared.push(uri),
  }))
  mock.module('expo-document-picker', () => ({ getDocumentAsync: () => state.pick() }))
  mock.module('expo-device', () => ({ manufacturer: 'Acme', modelName: 'Phone 1' }))
  mock.module('expo', () => ({
    ...realExpo,
    reloadAppAsync: async (reason?: string) => void state.reloads.push(reason ?? ''),
  }))
  return state
}

/**
 * Runs `action` (if any) inside `act`, then lets promises and timers settle
 * so state updates they cause are applied before the test looks.
 */
export function flush(action?: () => void): Promise<void> {
  return act(async () => {
    action?.()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  })
}
