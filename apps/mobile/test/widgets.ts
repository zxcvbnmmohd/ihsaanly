// Shared fakes for the widget tests. Both widget runtimes (SwiftUI via
// @expo/ui, RemoteViews via react-native-android-widget) are replaced with
// string host components, so a widget's element tree can be walked as plain
// data: no renderer, no DOM. Mocks list every export the app code imports so
// whichever test file loads first leaves a complete module behind.
import { mock } from 'bun:test'
import { Fragment, isValidElement, type ReactNode } from 'react'
import type { WidgetInfo } from 'react-native-android-widget'
import type { WidgetModel } from '../src/widgets/model'
import sample from '../src/widgets/sample.json'

export interface Node {
  type: string
  props: Record<string, unknown>
  children: Tree[]
}
export type Tree = Node | string

export interface Modifier {
  modifier: string
  args: unknown[]
}

export interface Env {
  widgetFamily?: string
  colorScheme?: string
  widgetRenderingMode?: string
}

type WidgetFunction = (props: WidgetModel, environment: Env) => ReactNode

const registry = new Map<string, WidgetFunction>()

const SWIFT_UI = [
  'AccessoryWidgetBackground',
  'Circle',
  'Gauge',
  'HStack',
  'Image',
  'Link',
  'Spacer',
  'Text',
  'VStack',
  'ZStack',
]
const MODIFIERS = [
  'containerBackground',
  'font',
  'foregroundStyle',
  'frame',
  'gaugeStyle',
  'lineLimit',
  'minimumScaleFactor',
  'multilineTextAlignment',
  'opacity',
  'padding',
  'strokeBorder',
  'widgetURL',
]

/**
 * Every export of react-native-android-widget the app imports. A module's
 * export list is fixed by whichever mock of it loads first, so every test that
 * mocks it must start from this and override only what it records.
 */
export function androidWidgetModule(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    FlexWidget: 'FlexWidget',
    TextWidget: 'TextWidget',
    registerWidgetTaskHandler: () => {},
    requestWidgetUpdate: async () => {},
    ...overrides,
  }
}

/** Installs the fakes; re-run in `beforeAll` in case a later-loading test file mocked a module over them. */
export function installWidgetMocks(): void {
  mock.module('@expo/ui/swift-ui', () => Object.fromEntries(SWIFT_UI.map((name) => [name, name])))
  mock.module('@expo/ui/swift-ui/modifiers', () =>
    Object.fromEntries(
      MODIFIERS.map((name) => [name, (...args: unknown[]): Modifier => ({ modifier: name, args })]),
    ),
  )
  mock.module('expo-widgets', () => ({
    createWidget: (name: string, fn: WidgetFunction) => {
      registry.set(name, fn)
      return { name }
    },
  }))
  mock.module('react-native-android-widget', () => androidWidgetModule())
}
installWidgetMocks()

/** The registered widget function for an iOS `createWidget` name (import its file first). */
export function iosWidget(name: string): WidgetFunction {
  const fn = registry.get(name)
  if (!fn) throw new Error(`${name} was not registered`)
  return fn
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {}
}

/** Expands components (calling them as plain functions) down to host nodes and text. */
export function expand(node: ReactNode): Tree[] {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(expand)
  if (!isValidElement(node)) return []
  const props = record(node.props)
  if (node.type === Fragment) return expand(props.children as ReactNode)
  if (typeof node.type === 'function') {
    return expand((node.type as (p: unknown) => ReactNode)(node.props))
  }
  return [{ type: String(node.type), props, children: expand(props.children as ReactNode) }]
}

/** The single root of an expanded widget. */
export function tree(node: ReactNode): Node {
  const [root] = expand(node)
  if (!root || typeof root === 'string') throw new Error('widget did not render a host node')
  return root
}

export function nodes(root: Tree): Node[] {
  if (typeof root === 'string') return []
  return [root, ...root.children.flatMap(nodes)]
}

/** Every visible string in document order (text children and TextWidget `text`). */
export function texts(root: Tree): string[] {
  if (typeof root === 'string') return [root]
  const own = typeof root.props.text === 'string' ? [root.props.text] : []
  return [...own, ...root.children.flatMap(texts)]
}

export function modifiers(node: Node): Modifier[] {
  const list = node.props.modifiers
  return Array.isArray(list)
    ? list
        .map(record)
        .map((m) => ({ modifier: String(m.modifier), args: Array.isArray(m.args) ? m.args : [] }))
    : []
}

/** The widgetURL set anywhere in the tree (iOS), in order. */
export function widgetUrls(root: Tree): string[] {
  return nodes(root).flatMap((node) =>
    modifiers(node)
      .filter((m) => m.modifier === 'widgetURL')
      .map((m) => String(m.args[0])),
  )
}

/** Android tap targets: clickAction + uri for each node that has one. */
export function clicks(root: Tree): { action: string; uri: string | null }[] {
  return nodes(root).flatMap((node) => {
    const action = node.props.clickAction
    if (typeof action !== 'string') return []
    const data = record(node.props.clickActionData)
    return [{ action, uri: typeof data.uri === 'string' ? data.uri : null }]
  })
}

/** A fresh copy of the sample entry with `patch` applied. */
export function model(patch: Partial<WidgetModel> = {}): WidgetModel {
  return { ...structuredClone(sample), ...patch }
}

/** A launcher size in dp, as the library reports it to a widget task. */
export function info(widgetName: string, width: number, height: number): WidgetInfo {
  return {
    widgetName,
    widgetId: 1,
    width,
    height,
    screenInfo: { screenHeightDp: 800, screenWidthDp: 400, density: 2, densityDpi: 320 },
  }
}
