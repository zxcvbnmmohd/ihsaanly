import { palettes } from '@ihsaanly/tailwind/tokens'
import * as Haptics from 'expo-haptics'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Sheet } from '../components/sheet'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { CountPanel } from '../types'

export interface CounterPanelProps {
  panel: CountPanel
  onCount: (itemId: string) => void
  /** The count reached its target: the route marks the item done and closes the panel. */
  onComplete: (itemId: string) => void
  onMarkAll: (itemId: string) => void
  onClose: () => void
}

/**
 * A counted dhikr in a sheet: one big tap area that counts, the count out of
 * its target, and "Mark all done" for someone who counted on their fingers.
 * Reaching the target completes it, once.
 */
export function CounterPanel({
  panel,
  onCount,
  onComplete,
  onMarkAll,
  onClose,
}: CounterPanelProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const { itemId, title, count, target } = panel
  const complete = count >= target
  const done = useRef(onComplete)
  done.current = onComplete

  useEffect(() => {
    if (complete) done.current(itemId)
  }, [complete, itemId])

  const tap = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onCount(itemId)
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={strings.today.countItem(title, count, target)}
        disabled={complete}
        onPress={tap}
        className="items-center justify-center gap-2 rounded-3xl"
        style={{ minHeight: 220, borderWidth: 2, borderColor: palette.accent }}>
        <Text
          aria-hidden
          className="text-6xl"
          maxFontSizeMultiplier={1.6}
          style={{ fontFamily: serif, fontWeight: '600', color: colors.label }}>
          {count}
        </Text>
        <Text aria-hidden className="text-base" style={{ color: colors.secondaryLabel }}>
          {strings.panel.progress(count, target)}
        </Text>
        <Text aria-hidden className="text-sm" style={{ color: palette.accent }}>
          {strings.panel.tapToCount}
        </Text>
      </Pressable>
      <View className="items-center">
        <Button
          title={strings.panel.markAll}
          onPress={() => onMarkAll(itemId)}
          variant="secondary"
          color={palette.accent}
        />
      </View>
    </Sheet>
  )
}
