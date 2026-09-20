import type { ReactElement } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { Button } from '@/components/button'
import { colors, type Palette } from '@/theme/colors'
import { fonts } from '@/theme/fonts'

interface CounterProps {
  count: number
  target: number
  onTap: () => void
  onReset: () => void
  resetLabel: string
  palette: Palette
}

/** One big target for a repeated dhikr: tap, count, and know when you are there. */
export function Counter({
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
      {count > 0 ? (
        <Button title={resetLabel} onPress={onReset} variant="secondary" color={palette.accent} />
      ) : null}
    </View>
  )
}
