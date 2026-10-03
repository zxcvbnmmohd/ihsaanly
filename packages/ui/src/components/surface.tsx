import { BlurView } from 'expo-blur'
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect'
import type { ReactElement } from 'react'
import { type ReactNode, useEffect, useState } from 'react'
import { AccessibilityInfo, View, type ViewProps } from 'react-native'

import { useColors } from '../colors'

const noop = (): void => {}

// Both availability checks read constants of the native module, so asking on
// each render costs nothing and keeps the platform check next to its use.
const canUseGlass = (): boolean =>
  process.env.EXPO_OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable()

/**
 * One elevated container that speaks each platform's own language:
 * liquid glass on iOS 26+, a system material blur on older iOS, and a warm
 * translucent veil over the wash on Android, where Material's surface-container
 * read as grey next to the iOS cards. Falls back to a solid system fill when
 * Reduce Transparency is on.
 *
 * ponytail: single `interactive` knob instead of a variant system — add
 * variants when a second surface style actually shows up in a design.
 */
interface Thing {
  reduceTransparency: boolean
}

interface SurfaceProps {
  children?: ReactNode
  style?: ViewProps['style']
  interactive?: boolean
}

export function Surface({ children, style, interactive = false }: SurfaceProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ reduceTransparency: false })
  const colors = useColors()

  useEffect(() => {
    const apply = (reduceTransparency: boolean): void => setThing({ reduceTransparency })

    // A rejection leaves the default, which is the false already in state.
    AccessibilityInfo.isReduceTransparencyEnabled().then(apply).catch(noop)
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', apply)
    return (): void => sub.remove()
  }, [])

  // Never clip a GlassView from the outside — it clips itself, and overflow
  // hidden cuts off the rim highlight and press bulge.
  const base: ViewProps['style'] = [{ borderCurve: 'continuous' }, style]

  if (thing.reduceTransparency) {
    return (
      <View style={[{ backgroundColor: colors.secondarySystemBackground }, base]}>{children}</View>
    )
  }

  if (process.env.EXPO_OS === 'android' || process.env.EXPO_OS === 'web') {
    return <View style={[{ backgroundColor: colors.surface }, base]}>{children}</View>
  }

  if (canUseGlass()) {
    return (
      <GlassView isInteractive={interactive} style={base}>
        {children}
      </GlassView>
    )
  }

  return (
    <BlurView tint="systemMaterial" intensity={80} style={[base, { overflow: 'hidden' }]}>
      {children}
    </BlurView>
  )
}
