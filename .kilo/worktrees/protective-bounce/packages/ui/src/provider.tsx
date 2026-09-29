import type { Strings } from '@ihsaanly/core/strings/en'
import { createContext, type ReactElement, type ReactNode, use } from 'react'
import type { AccessibilityProps, ColorValue } from 'react-native'

/**
 * The link the host draws. Screens only ever wrap a Pressable in it
 * (`asChild`), so this is the subset of expo-router's Link they use.
 */
export interface UiLinkProps extends AccessibilityProps {
  href: string
  asChild?: boolean
  children: ReactNode
}

/**
 * Raw system colours. On iOS these are PlatformColors, on Android Material 3
 * dynamic colours, on the web plain hex. Components read them through
 * `useColors()` and pass them in `style` (or as a colour prop): NativeWind 5
 * (RC) does not apply stylesheet colour variables on native, so colour
 * classes such as `text-system-label` are not used.
 */
export interface SystemColors {
  label: ColorValue
  secondaryLabel: ColorValue
  separator: ColorValue
  systemBackground: ColorValue
  secondarySystemBackground: ColorValue
  tint: ColorValue
  onTint: ColorValue
}

export interface UiContextValue {
  strings: Strings
  /** The scheme the host is actually rendering in, preference applied. */
  scheme: 'light' | 'dark'
  Link: (props: UiLinkProps) => ReactNode
  systemColors: SystemColors
}

const UiContext = createContext<UiContextValue | null>(null)

interface UiProviderProps {
  value: UiContextValue
  children: ReactNode
}

/** What every screen and component reads instead of the app's stores and router. */
export function UiProvider({ value, children }: UiProviderProps): ReactElement {
  return <UiContext value={value}>{children}</UiContext>
}

export function useUi(): UiContextValue {
  const value = use(UiContext)
  if (!value) throw new Error('useUi() needs a <UiProvider> above it.')
  return value
}
