/**
 * A stand-in for expo-router that renders and records instead of navigating.
 * `setup.ts` registers it for every test; a test reads `router.calls`, sets
 * `params` / `pathname` / `segments`, and resets with `resetRouter()`.
 */
import { createElement, Fragment, type ReactElement, type ReactNode } from 'react'

export const router = {
  /** Every imperative call, in order: `['push', '/diagnostics']`. */
  calls: [] as [string, ...unknown[]][],
  params: {} as Record<string, string | string[] | undefined>,
  pathname: '/',
  segments: [] as string[],
  /** The `options` of every `<Stack.Screen>` / `<Tabs.Screen>` rendered, in order. */
  screens: [] as Record<string, unknown>[],
  /** The `href` of every `<Redirect>` rendered. */
  redirects: [] as unknown[],
}

export function resetRouter(): void {
  router.calls.length = 0
  router.screens.length = 0
  router.redirects.length = 0
  router.params = {}
  router.pathname = '/'
  router.segments = []
}

interface Children {
  children?: ReactNode
}

const imperative = {
  push: (...args: unknown[]) => router.calls.push(['push', ...args]),
  replace: (...args: unknown[]) => router.calls.push(['replace', ...args]),
  back: () => router.calls.push(['back']),
  dismiss: (...args: unknown[]) => router.calls.push(['dismiss', ...args]),
  navigate: (...args: unknown[]) => router.calls.push(['navigate', ...args]),
  canGoBack: () => true,
  setParams: (...args: unknown[]) => router.calls.push(['setParams', ...args]),
}

function Screen(props: { options?: Record<string, unknown> }): null {
  if (props.options) router.screens.push(props.options)
  return null
}

/** `<Stack>` renders its children (the `<Stack.Screen>`s) so their options are recorded. */
export function Stack({ children }: Children): ReactElement {
  return createElement(Fragment, null, children)
}
Stack.Screen = Screen
Stack.Header = () => null
Stack.Toolbar = () => null

export const stackModule = { default: Stack, Stack }

export function Link({
  href,
  children,
  ...rest
}: { href: unknown } & Children & Record<string, unknown>): ReactElement {
  return createElement('a', { ...rest, 'data-href': String(href) }, children as ReactNode)
}

export const expoRouter = {
  router: imperative,
  useRouter: () => imperative,
  useLocalSearchParams: () => router.params,
  useGlobalSearchParams: () => router.params,
  usePathname: () => router.pathname,
  useSegments: () => router.segments,
  Stack,
  Slot: ({ children }: Children) => createElement(Fragment, null, children),
  Link,
  Redirect: ({ href }: { href: unknown }) => {
    router.redirects.push(href)
    return null
  },
  Color: new Proxy(
    { ios: new Proxy({}, { get: (_t, key) => String(key) }) },
    {
      get: (target, key) => (key in target ? (target as never)[key] : String(key)),
    },
  ),
}

export const nativeTabs = {
  NativeTabs: Object.assign(
    ({ children }: Children) => createElement('div', { 'data-native-tabs': true }, children),
    {
      Trigger: Object.assign(
        ({ children, name }: Children & { name?: string }) =>
          createElement('div', { 'data-trigger': name }, children),
        { Icon: () => null, Label: () => null, Badge: () => null },
      ),
    },
  ),
}

export const navigationTheme = {
  DarkTheme: { dark: true, colors: {} },
  DefaultTheme: { dark: false, colors: {} },
  ThemeProvider: ({ children }: Children) => createElement(Fragment, null, children),
}
