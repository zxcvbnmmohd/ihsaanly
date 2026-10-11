import type { ReactElement, ReactNode } from 'react'
import { type ColorValue, View, type ViewProps, type ViewStyle } from 'react-native'

import type { Colors } from '../colors'
import { useColors } from '../colors'
import { Ringed, ringSpace } from './ring'

/**
 * The slice of react-native-web's `Pressable` render-prop state a web-only
 * leaf needs. Native code never produces one of these — `hovered`/`focused`
 * only exist on the web — so both are optional here rather than widened to
 * `boolean` and defaulted, which would claim a value native never supplies.
 */
export interface WebPressableState {
  readonly pressed: boolean
  readonly hovered?: boolean
  readonly focused?: boolean
}

/**
 * The hover tint and focus ring every interactive surface gets on the web —
 * `Row` today, `LibraryCard` next — derived once here so a caller only has
 * to hand back the Pressable state react-native-web already gives it for
 * free. Cursor `pointer` needs nothing: `Pressable` sets it itself.
 */
export function webInteractiveStyle(state: WebPressableState, colors: Colors): ViewStyle[] {
  return [
    state.hovered ? { backgroundColor: colors.tint } : {},
    state.focused ? { outlineColor: colors.accent, outlineWidth: 2, outlineStyle: 'solid' } : {},
  ]
}

interface SurfaceProps {
  children?: ReactNode
  style?: ViewProps['style']
  interactive?: boolean
  /** A selection ring around the surface; see the native `Surface`. */
  ring?: ColorValue
}

/**
 * The web's surface: the warm translucent veil Android uses. There is no
 * liquid glass or system material here, and react-native-web has no Reduce
 * Transparency setting to follow. `interactive` carries no styling of its
 * own here — the caller composes `webInteractiveStyle` into `style` — it
 * stays a prop only so a `<Surface interactive>` call site reads the same
 * on every platform.
 */
export function Surface({ children, style, ring }: SurfaceProps): ReactElement {
  const colors = useColors()

  if (ring === undefined) {
    return <View style={[{ backgroundColor: colors.surface }, style]}>{children}</View>
  }
  return (
    <Ringed ring={ring} style={style}>
      <View style={[{ backgroundColor: colors.surface }, style, ringSpace]}>{children}</View>
    </Ringed>
  )
}
