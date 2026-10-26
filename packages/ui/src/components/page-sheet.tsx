import type { ReactElement, ReactNode } from 'react'
import { type ColorValue, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors } from '../colors'
import { serif } from '../fonts'
import { useUi } from '../provider'
import { Button } from './button'
import { useRecede } from './recede'
import { Sheet } from './sheet'

export interface PageSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
  /**
   * The word on the button that closes it: iOS puts it in the sheet's header,
   * Android under the content. Without it iOS says Close and Android keeps
   * only the sheet's own close button.
   */
  closeLabel?: string
  /** The colour of that button. Defaults to the system tint. */
  accent?: ColorValue
  onAccent?: ColorValue
}

/**
 * iOS's own page sheet, which a swipe down closes; Android has no such
 * presentation, so it keeps the shared Sheet, whose content scrolls. On both
 * the app behind steps back as a card (RecedeProvider) and stays in view. The
 * host mounts it only while it is open.
 */
export function PageSheet({
  title,
  onClose,
  children,
  closeLabel,
  accent,
  onAccent,
}: PageSheetProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  const insets = useSafeAreaInsets()
  useRecede()

  if (process.env.EXPO_OS !== 'ios') {
    return (
      <Sheet title={title} onClose={onClose}>
        {/* Ten languages outgrow a small phone, so the content scrolls inside the sheet. */}
        <ScrollView style={{ maxHeight: 420 }} contentContainerClassName="gap-2">
          {children}
        </ScrollView>
        {closeLabel ? (
          <Button title={closeLabel} onPress={onClose} color={accent} onColor={onAccent} />
        ) : null}
      </Sheet>
    )
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      // Also what a swipe down calls, so the host's state follows the sheet.
      onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: colors.paper }}>
        <View className="flex-row items-center gap-3 px-5 pt-5 pb-3">
          <Text
            accessibilityRole="header"
            className="flex-1 font-semibold text-xl"
            style={{ fontFamily: serif, color: colors.label }}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={12}
            style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text className="font-semibold text-base" style={{ color: accent ?? colors.accent }}>
              {closeLabel ?? strings.panel.close}
            </Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerClassName="gap-2 px-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  )
}
