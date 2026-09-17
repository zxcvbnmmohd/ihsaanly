import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, useColorScheme, View, type ViewProps } from 'react-native';

import { colors } from '@/theme/colors';

const canUseGlass =
  process.env.EXPO_OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * One elevated container that speaks each platform's own language:
 * liquid glass on iOS 26+, a system material blur on older iOS, and a
 * Material 3 surface-container on Android. Falls back to a solid fill when
 * Reduce Transparency is on.
 *
 * ponytail: single `interactive` knob instead of a variant system — add
 * variants when a second surface style actually shows up in a design.
 */
export function Surface({
  children,
  style,
  interactive = false,
}: {
  children?: ReactNode;
  style?: ViewProps['style'];
  interactive?: boolean;
}) {
  const [reduceTransparency, setReduceTransparency] = useState(false);
  // Android's Material colors don't re-resolve on their own — subscribing to the
  // scheme here forces a re-render when the theme flips (React Compiler memoizes).
  useColorScheme();

  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );
    return () => sub.remove();
  }, []);

  // Never clip a GlassView from the outside — it clips itself, and overflow
  // hidden cuts off the rim highlight and press bulge.
  const base: ViewProps['style'] = [{ borderCurve: 'continuous' }, style];

  if (reduceTransparency || process.env.EXPO_OS === 'android' || process.env.EXPO_OS === 'web') {
    return (
      <View style={[base, { backgroundColor: colors.secondarySystemBackground }]}>{children}</View>
    );
  }

  if (canUseGlass) {
    return (
      <GlassView isInteractive={interactive} style={base}>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView tint="systemMaterial" intensity={80} style={[base, { overflow: 'hidden' }]}>
      {children}
    </BlurView>
  );
}
