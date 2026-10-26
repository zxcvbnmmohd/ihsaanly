import { brand, palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { useEffect, useRef } from 'react'
import { AccessibilityInfo, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUi } from '../provider'
import { UNDO_MS } from '../types'

export interface ToastAction {
  label: string
  /** What a screen reader says for the button, when `label` alone is too terse. */
  accessibilityLabel?: string
  onPress: () => void
}

export interface ToastMessage {
  /** A new id is a new toast: it restarts the timer and is announced again. */
  id: string
  text: string
  action?: ToastAction
}

export interface ToastProps {
  toast: ToastMessage | null
  /** Called once the toast has been up for `durationMs` untouched. */
  onDismiss: () => void
  durationMs?: number
  /** Points between the bottom safe area and the pill: room for a tab bar. */
  offset?: number
}

/**
 * A short message in a pill along the bottom ("Marked done · Undo") that goes
 * away on its own. The pill is the scheme inverted, so its action takes the
 * other scheme's accent.
 *
 * The live region stays mounted while empty so a screen reader announces each
 * new message politely, without taking focus from where the finger is. iOS
 * has no live regions, so there each new message is announced outright.
 */
export function Toast({
  toast,
  onDismiss,
  durationMs = UNDO_MS,
  offset = 16,
}: ToastProps): ReactElement {
  const { scheme } = useUi()
  const palette = palettes[scheme]
  const inverted = palettes[scheme === 'light' ? 'dark' : 'light']
  const insets = useSafeAreaInsets()
  // The timer runs per toast (`toast.id`), not per render: a host that builds
  // a new handler each render must not keep the toast up forever.
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  const id = toast?.id ?? null
  const text = toast?.text ?? ''

  // biome-ignore lint/correctness/useExhaustiveDependencies: each new toast restarts its timer and is announced once; its text belongs to its id.
  useEffect(() => {
    if (id === null) return
    if (process.env.EXPO_OS === 'ios') AccessibilityInfo.announceForAccessibility(text)
    const timer = setTimeout(() => dismiss.current(), durationMs)
    return (): void => clearTimeout(timer)
  }, [id, durationMs])

  return (
    <View
      role="status"
      aria-live="polite"
      accessibilityLiveRegion="polite"
      className="absolute start-0 end-0 bottom-0 items-center px-4"
      // Empty, it takes no room: react-native-web drops pointerEvents from this
      // style, so a padded empty region would swallow taps on what is under it.
      style={{ paddingBottom: toast ? insets.bottom + offset : 0, pointerEvents: 'box-none' }}>
      {toast ? (
        <View
          className="w-full max-w-md flex-row items-center gap-3 rounded-full ps-5 pe-2"
          style={{ backgroundColor: palette.ink, minHeight: 52, borderCurve: 'continuous' }}>
          <Text className="flex-1 py-3 text-base" style={{ color: brand.paper[scheme] }}>
            {toast.text}
          </Text>
          {toast.action ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={toast.action.accessibilityLabel ?? toast.action.label}
              onPress={toast.action.onPress}
              className="items-center justify-center px-3"
              style={{ minHeight: 44 }}>
              <Text className="font-semibold text-base" style={{ color: inverted.accent }}>
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
