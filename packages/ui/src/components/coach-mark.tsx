import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { type ComponentRef, useEffect, useRef } from 'react'
import {
  AccessibilityInfo,
  type DimensionValue,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from 'react-native'
import { useUi } from '../provider'

const ARROW = 14

export interface CoachMarkProps {
  text: string
  /** 0-based. */
  step: number
  total: number
  onNext: () => void
  onSkip: () => void
  /**
   * Where the arrow points from, along the start edge: points (from the start
   * edge, so it mirrors under right-to-left) or a percentage. Null draws no
   * arrow, for a tip with nothing on screen to point at.
   */
  arrowAt: number | `${number}%` | null
}

/**
 * One step of a first-run tour: a tip drawn just under what it explains, an
 * arrow pointing up at it, "1 of 3", Skip and Next ("Got it" on the last).
 * The host places it in the flow right after the target, so it scrolls and
 * mirrors with the layout instead of being measured and floated.
 *
 * Focus moves to it on each step, so a keyboard or screen-reader user meets
 * it where it appears; Escape (or the iOS escape gesture) skips the tour.
 */
export function CoachMark({
  text,
  step,
  total,
  onNext,
  onSkip,
  arrowAt,
}: CoachMarkProps): ReactElement {
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const next = useRef<ComponentRef<typeof Pressable>>(null)
  const last = step >= total - 1

  // biome-ignore lint/correctness/useExhaustiveDependencies: each new step moves focus to it.
  useEffect(() => {
    const node = next.current
    if (!node) return
    if (process.env.EXPO_OS === 'web') (node as unknown as HTMLElement).focus()
    else AccessibilityInfo.sendAccessibilityEvent(node, 'focus')
  }, [step])

  const onKeyDown = (event: NativeSyntheticEvent<unknown>): void => {
    if ((event.nativeEvent as KeyboardEvent).key === 'Escape') onSkip()
  }

  return (
    <View
      role="dialog"
      aria-label={strings.tour.step(step + 1, total)}
      onAccessibilityEscape={onSkip}
      onKeyDown={onKeyDown}
      style={{ paddingTop: arrowAt === null ? 0 : ARROW / 2 }}>
      {arrowAt === null ? null : (
        <View
          testID="coach-arrow"
          style={{
            position: 'absolute',
            top: 0,
            start: arrowAt as DimensionValue,
            marginStart: -ARROW / 2,
            width: ARROW,
            height: ARROW,
            backgroundColor: palette.accent,
            transform: [{ rotate: '45deg' }],
          }}
        />
      )}
      <View className="gap-3 rounded-2xl p-4" style={{ backgroundColor: palette.accent }}>
        <Text className="text-base leading-snug" style={{ color: palette.onAccent }}>
          {text}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="flex-1 text-xs" style={{ color: palette.onAccent }}>
            {strings.tour.step(step + 1, total)}
          </Text>
          {last ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={onSkip}
              className="items-center justify-center px-3"
              style={{ minHeight: 44 }}>
              <Text className="font-semibold text-sm" style={{ color: palette.onAccent }}>
                {strings.tour.skip}
              </Text>
            </Pressable>
          )}
          <Pressable
            ref={next}
            accessibilityRole="button"
            onPress={onNext}
            className="items-center justify-center rounded-full px-4"
            style={{ minHeight: 44, backgroundColor: palette.onAccent }}>
            <Text className="font-semibold text-sm" style={{ color: palette.accent }}>
              {last ? strings.tour.done : strings.tour.next}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}
