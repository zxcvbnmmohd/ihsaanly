import type { ReactElement, ReactNode } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useColors } from '../colors'
import { serif } from '../fonts'
import { useLayout } from '../layout'
import { useUi } from '../provider'

export interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * A modal panel over the current screen: a bottom sheet at `compact` (a phone,
 * or the extension's popup), a centred panel at `regular` and `wide`. The
 * scrim, the close button and the system back gesture (or Escape on the web)
 * all close it. The host mounts it only while it is open.
 */
export function Sheet({ title, onClose, children }: SheetProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const compact = useLayout() === 'compact'
  const insets = useSafeAreaInsets()

  return (
    <Modal transparent visible animationType={compact ? 'slide' : 'fade'} onRequestClose={onClose}>
      <View className={compact ? 'flex-1 justify-end' : 'flex-1 items-center justify-center p-6'}>
        <Pressable
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          tabIndex={-1}
          testID="sheet-scrim"
          onPress={onClose}
          className="absolute start-0 end-0 top-0 bottom-0"
          style={{ backgroundColor: colors.ink, opacity: 0.35 }}
        />
        <View
          role="dialog"
          aria-modal
          aria-label={title}
          accessibilityViewIsModal
          className={compact ? 'w-full gap-4 rounded-t-3xl p-5' : 'w-full gap-4 rounded-3xl p-6'}
          style={{
            backgroundColor: colors.paper,
            maxWidth: compact ? undefined : 440,
            paddingBottom: compact ? insets.bottom + 20 : 24,
          }}>
          <View className="flex-row items-center gap-3">
            <Text
              accessibilityRole="header"
              className="flex-1 font-semibold text-xl"
              style={{ fontFamily: serif, color: colors.label }}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.panel.close}
              onPress={onClose}
              className="items-center justify-center rounded-full"
              style={{ width: 44, height: 44 }}>
              <Text
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={{ color: colors.secondaryLabel, fontSize: 17 }}>
                ✕
              </Text>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  )
}
