import type { ReactElement } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { Button } from '@/components/button'
import { colors, type Palette } from '@/theme/colors'
import { fonts } from '@/theme/fonts'

interface CounterProps {
  /** Names the dhikr, so the spoken control is not just a number. */
  label: string
  count: number
  target: number
  onTap: () => void
  onReset: () => void
  resetLabel: string
  palette: Palette
}

/** One big target for a repeated dhikr: tap, count, and know when you are there. */
export function Counter({
  label,
  count,
  target,
  onTap,
  onReset,
  resetLabel,
  palette,
}: CounterProps): ReactElement {
  useColorScheme()
  const complete = count >= target

  return (
    <View className="items-center gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ now: count, max: target, min: 0 }}
        onPress={onTap}
        disabled={complete}
        className="items-center justify-center rounded-full"
        style={{
          width: 168,
          height: 168,
          borderWidth: 2,
          borderColor: palette.accent,
          backgroundColor: complete ? palette.accent : undefined,
        }}>
        <Text
          className="text-5xl"
          // The circle is a fixed 168pt, so the glyph is capped rather than
          // letting the largest Dynamic Type sizes clip it.
          maxFontSizeMultiplier={1.4}
          style={{
            color: complete ? palette.onAccent : colors.label,
            fontFamily: fonts.display,
            fontWeight: '600',
          }}>
          {complete ? '✓' : count}
        </Text>
        <Text
          className="text-sm"
          style={{ color: complete ? palette.onAccent : colors.secondaryLabel }}>
          {complete ? `${target}` : `/ ${target}`}
        </Text>
      </Pressable>
      {/* Kept mounted and merely invisible: unmounting it moved the Done
          button underneath on the very first tap, mid-interaction. */}
      <View
        pointerEvents={count > 0 ? 'auto' : 'none'}
        accessibilityElementsHidden={count === 0}
        importantForAccessibility={count > 0 ? 'auto' : 'no-hide-descendants'}
        style={{ opacity: count > 0 ? 1 : 0 }}>
        <Button title={resetLabel} onPress={onReset} variant="secondary" color={palette.accent} />
      </View>
    </View>
  )
}
