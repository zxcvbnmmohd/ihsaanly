import type { ReactElement, ReactNode } from 'react'
import { type ColorValue, StyleSheet, View, type ViewProps } from 'react-native'

/** The selection ring's width, reserved whether or not the ring is showing. */
export const RING_WIDTH = 2

/** The space a ringed surface keeps for its ring, so selecting it never shifts its content. */
export const ringSpace = { borderWidth: RING_WIDTH, borderColor: 'transparent' } as const

interface RingedProps {
  children: ReactNode
  ring: ColorValue
  /** The surface's own style, read only for its corner radius. */
  style?: ViewProps['style']
}

/**
 * Draws a selection ring over a surface from a plain sibling view. The ring
 * can't be the surface's own border: iOS 26's GlassView fills itself with a
 * UIVisualEffectView that covers React Native's border layer, so a border on
 * the glass never shows.
 */
export function Ringed({ children, ring, style }: RingedProps): ReactElement {
  const borderRadius = StyleSheet.flatten(style)?.borderRadius

  return (
    <View>
      {children}
      <View
        testID="surface-ring"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            borderCurve: 'continuous',
            borderWidth: RING_WIDTH,
            borderColor: ring,
            pointerEvents: 'none',
          },
        ]}
      />
    </View>
  )
}
