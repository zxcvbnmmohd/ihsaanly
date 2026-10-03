import type { ReactElement } from 'react'
import { useContext } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Surface } from '../components/surface'
import type { WebPressableState } from '../components/surface.web'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { TodayEntry } from '../screens/today'
import { MarkCircle } from './mark-circle'
import { TourAnchorContext } from './tour-anchor'

/** Room the circle takes at the start of a card: its 44pt target and a gap. */
const CIRCLE_INSET = 8
const CIRCLE_ROOM = CIRCLE_INSET + 44 + 6

export interface EntryCardProps {
  entry: TodayEntry
  onCircle: (id: string) => void
  /** `hero` is Right now: the one card that dominates. */
  variant?: 'hero' | 'row'
  testID?: string
}

/**
 * A Today row: a card that opens the item, with the mark circle at its start
 * and a chevron at its end. The circle is a separate button laid over the
 * card rather than inside the link, so each is its own control: tapping the
 * circle marks, tapping anywhere else opens.
 */
export function EntryCard({
  entry,
  onCircle,
  variant = 'row',
  testID,
}: EntryCardProps): ReactElement {
  const colors = useColors()
  const { strings, Link } = useUi()
  const anchor = useContext(TourAnchorContext)
  const hero = variant === 'hero'
  const padding = hero ? 20 : 14

  const card = (state: WebPressableState): ReactElement => (
    <Surface
      interactive
      style={[
        {
          borderRadius: hero ? 24 : 16,
          borderWidth: 1,
          borderColor: hero ? colors.accent : colors.rule,
          padding,
          paddingStart: entry.mark ? CIRCLE_ROOM : padding + 4,
          opacity: state.pressed ? 0.85 : 1,
        },
        // The hover tint and focus ring `webInteractiveStyle` gives a Row; the
        // web is the only place `hovered`/`focused` are ever set.
        state.hovered ? { backgroundColor: colors.tint } : null,
        state.focused
          ? { outlineColor: colors.accent, outlineWidth: 2, outlineStyle: 'solid' as const }
          : null,
      ]}>
      <View className="flex-row items-center gap-3" style={{ minHeight: 44 }}>
        <View className="flex-1 gap-1">
          <Text
            className={hero ? 'text-2xl leading-tight' : 'font-semibold text-base'}
            style={{
              color: colors.label,
              ...(hero ? { fontFamily: serif, fontWeight: '600' as const } : {}),
            }}>
            {entry.title}
          </Text>
          {entry.detail ? (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              {entry.detail}
            </Text>
          ) : null}
        </View>
        {/* U+203A mirrors itself in right-to-left text, so it points onward either way. */}
        <Text
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="text-2xl"
          style={{ color: colors.secondaryLabel }}>
          ›
        </Text>
      </View>
    </Surface>
  )

  return (
    <View className="gap-3">
      <View>
        {entry.mark ? (
          <View
            className="justify-center"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              start: CIRCLE_INSET,
              zIndex: 1,
              pointerEvents: 'box-none',
            }}>
            <MarkCircle
              title={entry.title}
              mark={entry.mark}
              onPress={() => onCircle(entry.id)}
              testID={`circle-${entry.id}`}
            />
          </View>
        ) : null}
        <Link href={entry.href} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={strings.today.open(entry.title)}
            testID={testID}>
            {(state: WebPressableState) => card(state)}
          </Pressable>
        </Link>
      </View>
      {anchor.id === entry.id ? anchor.node : null}
    </View>
  )
}
