import { brand, palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUi } from '../provider'
import { type TodayUndo, UNDO_MS } from '../types'

export interface UndoBarProps {
  undo: TodayUndo | null
  /** Called once the bar has been up for `UNDO_MS` without Undo. */
  onDismiss: () => void
}

/**
 * "Marked done · Undo" along the bottom for a few seconds after a mark. The
 * live region stays mounted while empty so a screen reader announces each
 * new message politely, without taking focus from where the finger is.
 */
export function UndoBar({ undo, onDismiss }: UndoBarProps): ReactElement {
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  // The bar is the scheme inverted, so its Undo takes the other scheme's accent.
  const inverted = palettes[scheme === 'light' ? 'dark' : 'light']
  const insets = useSafeAreaInsets()
  // The timer runs per mark (`undo.id`), not per render: a host that builds a
  // new handler each render must not keep the bar up forever.
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  const id = undo?.id ?? null

  useEffect(() => {
    if (id === null) return
    const timer = setTimeout(() => dismiss.current(), UNDO_MS)
    return (): void => clearTimeout(timer)
  }, [id])

  return (
    <View
      role="status"
      aria-live="polite"
      accessibilityLiveRegion="polite"
      className="absolute start-0 end-0 bottom-0 items-center px-4"
      // Empty, it takes no room: react-native-web drops pointerEvents from this
      // style, so a padded empty region would swallow taps on what is under it.
      style={{ paddingBottom: undo ? insets.bottom + 16 : 0, pointerEvents: 'box-none' }}>
      {undo ? (
        <View
          className="w-full max-w-md flex-row items-center gap-3 rounded-2xl ps-4 pe-2"
          style={{ backgroundColor: palette.ink, minHeight: 52 }}>
          <Text className="flex-1 text-base" style={{ color: brand.paper[scheme] }}>
            {strings.today.markedDone}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.today.undoItem(undo.title)}
            onPress={undo.onUndo}
            className="items-center justify-center px-3"
            style={{ minHeight: 44 }}>
            <Text className="font-semibold text-base" style={{ color: inverted.accent }}>
              {strings.today.undo}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
