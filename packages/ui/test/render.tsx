/// <reference path="./jest-dom.d.ts" />
// Renders a screen or component the way a web host does: inside UiProvider,
// with a real string table, a scheme, the web system colours and a fake Link
// that records where it would navigate. Needs the DOM from ./preload.ts.
import type { SupportedLanguage } from '@ihsaanly/core/i18n/locale'
import { ar } from '@ihsaanly/core/strings/ar'
import { en, type Strings } from '@ihsaanly/core/strings/en'
import { fr } from '@ihsaanly/core/strings/fr'
import { hi } from '@ihsaanly/core/strings/hi'
import { it } from '@ihsaanly/core/strings/it'
import { ja } from '@ihsaanly/core/strings/ja'
import { so } from '@ihsaanly/core/strings/so'
import { ur } from '@ihsaanly/core/strings/ur'
import { yue } from '@ihsaanly/core/strings/yue'
import { zh } from '@ihsaanly/core/strings/zh'
import { system } from '@ihsaanly/tailwind/tokens'
import { act, type RenderResult, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Children, cloneElement, isValidElement, type ReactElement } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import type { Layout } from '../src/layout'
import { type UiContextValue, type UiLinkProps, UiProvider } from '../src/provider'

export const STRINGS: Record<SupportedLanguage, Strings> = {
  en,
  ar,
  fr,
  hi,
  it,
  ja,
  so,
  ur,
  yue,
  zh,
}

export interface RenderScreenOptions {
  /** Which string table the screen reads; English by default. */
  locale?: SupportedLanguage
  scheme?: 'light' | 'dark'
  /** Forces compact/regular/wide instead of measuring the (zero-sized) window. */
  layout?: Layout
}

export interface RenderScreenResult extends RenderResult {
  /** user-event, set up for this render: `await user.click(button)`. */
  user: ReturnType<typeof userEvent.setup>
  /** Every href a Link was pressed for, in order. */
  navigations: string[]
  strings: Strings
}

function systemColorsFor(scheme: 'light' | 'dark'): UiContextValue['systemColors'] {
  return {
    label: system['system-label'].web[scheme],
    secondaryLabel: system['system-secondary-label'].web[scheme],
    separator: system['system-separator'].web[scheme],
    systemBackground: system['system-background'].web[scheme],
    secondarySystemBackground: system['system-secondary-background'].web[scheme],
    tint: system['system-tint'].web[scheme],
    onTint: system['system-on-tint'].web[scheme],
  }
}

/**
 * A Link like expo-router's `asChild` one: the child keeps rendering itself,
 * gains `href` (react-native-web draws an anchor) and, when pressed, records
 * the navigation instead of performing it.
 */
function fakeLink(navigations: string[]): UiContextValue['Link'] {
  return function FakeLink({ href, asChild, children, ...accessibility }: UiLinkProps) {
    const child = Children.only(children)
    if (!asChild || !isValidElement<Record<string, unknown>>(child)) {
      return (
        <a href={href} onClick={() => navigations.push(href)}>
          {children}
        </a>
      )
    }
    const onPress = child.props.onPress as ((...args: unknown[]) => void) | undefined
    return cloneElement(child, {
      ...accessibility,
      href,
      onPress: (...args: unknown[]) => {
        navigations.push(href)
        onPress?.(...args)
      },
    })
  }
}

/** A 390×844 window with no notch, so safe-area hooks have a value on the first render. */
const NO_INSETS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  // biome-ignore lint/plugin: safe-area-context's own (physical) inset shape.
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

/** Renders `ui` inside SafeAreaProvider and UiProvider; see RenderScreenOptions. */
export function renderScreen(
  ui: ReactElement,
  { locale = 'en', scheme = 'light', layout }: RenderScreenOptions = {},
): RenderScreenResult {
  const navigations: string[] = []
  const strings = STRINGS[locale]
  const value: UiContextValue = {
    strings,
    scheme,
    Link: fakeLink(navigations),
    systemColors: systemColorsFor(scheme),
    layout,
  }
  // react-native-web draws a disabled control with pointer-events: none;
  // clicking it anyway is how a test proves a disabled control does nothing.
  const user = userEvent.setup({ pointerEventsCheck: 0 })
  const result = render(
    <SafeAreaProvider initialMetrics={NO_INSETS}>
      <UiProvider value={value}>{ui}</UiProvider>
    </SafeAreaProvider>,
  )
  return { ...result, user, navigations, strings }
}

/**
 * Tells a view with an `onLayout` that it measured `width` x `height`.
 * react-native-web reports layout through ResizeObserver, which a DOM
 * without layout never fires; the handler it would call is on the node.
 */
export function fireLayout(element: Element, width: number, height = 0): void {
  const handler = (element as unknown as Record<string, unknown>).__reactLayoutHandler as
    | ((event: unknown) => void)
    | undefined
  if (!handler) throw new Error('This element has no onLayout handler.')
  act(() => handler({ nativeEvent: { layout: { x: 0, y: 0, width, height } } }))
}

/**
 * A `name` matcher for rows whose accessible name is the title followed by
 * its detail: `getByRole('radio', { name: named(title) })`.
 */
export function named(title: string): (accessibleName: string) => boolean {
  return (accessibleName) => accessibleName.startsWith(title)
}
