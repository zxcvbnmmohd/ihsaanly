import type { Strings } from '@ihsaanly/core/strings/en'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { useUi } from '../provider'
import type { EntryMark } from '../types'

/** The drawn circle; the pressable around it is 44pt, the minimum touch target. */
export const CIRCLE_SIZE = 36
const TARGET = 44
const STROKE = 2.5

export interface MarkCircleProps {
  title: string
  mark: EntryMark
  onPress: () => void
  /** For the first-run tour, which points at this circle. */
  testID?: string
}

/** What a screen reader hears: what pressing the circle will do, and how far along it is. */
export function circleLabel(title: string, mark: EntryMark, strings: Strings): string {
  if (mark.done) return strings.today.unmark(title)
  if (!mark.progress) return strings.today.markDone(title)
  const { kind, value, total } = mark.progress
  return kind === 'count'
    ? strings.today.countItem(title, value, total)
    : strings.today.partsItem(title, value, total)
}

/**
 * The circle at the start of a Today row: outlined, filled with a tick when
 * done, and a progress ring ("12/33") for counted or multi-part items. Its
 * own focusable button, apart from the card's link, so marking never opens
 * the item and opening never marks it.
 */
export function MarkCircle({ title, mark, onPress, testID }: MarkCircleProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={circleLabel(title, mark, strings)}
      onPress={onPress}
      hitSlop={4}
      testID={testID}
      className="items-center justify-center rounded-full"
      style={{ width: TARGET, height: TARGET }}>
      {mark.done ? (
        <View
          className="items-center justify-center rounded-full"
          style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, backgroundColor: palette.accent }}>
          <Text
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ color: palette.onAccent, fontSize: 17, lineHeight: 20 }}>
            ✓
          </Text>
        </View>
      ) : mark.progress ? (
        <ProgressRing
          fraction={mark.progress.total > 0 ? mark.progress.value / mark.progress.total : 0}
          color={palette.accent}
          track={colors.fieldBorder}>
          <Text
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.2}
            // "30/33" fills the ring's inside at 10pt; a smaller face leaves it a margin.
            style={{
              color: colors.label,
              fontSize: `${mark.progress.value}/${mark.progress.total}`.length > 4 ? 8.5 : 10,
              fontWeight: '600',
            }}>
            {`${mark.progress.value}/${mark.progress.total}`}
          </Text>
        </ProgressRing>
      ) : (
        <View
          className="rounded-full"
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            borderWidth: STROKE,
            borderColor: colors.fieldBorder,
          }}
        />
      )}
    </Pressable>
  )
}

interface ProgressRingProps {
  /** 0 to 1. */
  fraction: number
  color: string
  track: string
  children: ReactElement
}

/**
 * A ring filled clockwise from the top, drawn from two clipped half-rings so
 * it needs no SVG. Each half is a circle with only its top and right borders
 * coloured (a half-circle arc), rotated into place inside a clip of one half
 * of the box. This is geometry, not reading order: rotation does not mirror
 * in right-to-left layouts, so the offsets and borders here are physical
 * (left/right) on purpose, and the ring fills clockwise in every language.
 */
export function ProgressRing({
  fraction,
  color,
  track,
  children,
}: ProgressRingProps): ReactElement {
  const degrees = Math.max(0, Math.min(1, fraction)) * 360
  const half = CIRCLE_SIZE / 2
  // The arc a top+end border draws runs from -45° to 135°; +45° puts it at 0°–180°.
  const arc = (rotation: number): ReactElement => (
    <View
      style={{
        position: 'absolute',
        top: 0,
        // Pinned, not left to the static position, which right-to-left
        // layout would put at the other edge of its zero-width parent.
        // biome-ignore lint/plugin: geometry; see ProgressRing.
        left: 0,
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: half,
        borderWidth: STROKE,
        borderColor: 'transparent',
        borderTopColor: color,
        // biome-ignore lint/plugin: geometry; see ProgressRing.
        borderRightColor: color,
        transform: [{ rotate: `${45 + rotation}deg` }],
      }}
    />
  )

  return (
    <View
      style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
      className="items-center justify-center">
      <View
        style={{
          position: 'absolute',
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: half,
          borderWidth: STROKE,
          borderColor: track,
        }}
      />
      {degrees > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            // biome-ignore lint/plugin: geometry; see ProgressRing.
            left: half,
            width: half,
            height: CIRCLE_SIZE,
            overflow: 'hidden',
          }}>
          {/* biome-ignore lint/plugin: geometry; see ProgressRing. */}
          <View style={{ position: 'absolute', top: 0, left: -half }}>
            {arc(Math.min(degrees, 180) - 180)}
          </View>
        </View>
      ) : null}
      {degrees > 180 ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            // biome-ignore lint/plugin: geometry; see ProgressRing.
            left: 0,
            width: half,
            height: CIRCLE_SIZE,
            overflow: 'hidden',
          }}>
          {/* biome-ignore lint/plugin: geometry; see ProgressRing. */}
          <View style={{ position: 'absolute', top: 0, left: 0 }}>{arc(degrees - 180)}</View>
        </View>
      ) : null}
      {children}
    </View>
  )
}
