import type { Palette } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useColors } from '../colors'
import { serif } from '../fonts'
import { Button } from './button'

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
  const colors = useColors()
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
          borderColor: palette.accent,
          backgroundColor: complete ? palette.accent : undefined,
          minWidth: 168,
          minHeight: 168,
          borderWidth: 2,
        }}>
        <Text
          className="text-5xl"
          // The circle is 168pt at least and grows with the text; 2x still fits inside it.
          maxFontSizeMultiplier={2}
          style={{
            fontFamily: serif,
            fontWeight: '600',
            color: complete ? palette.onAccent : colors.label,
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
