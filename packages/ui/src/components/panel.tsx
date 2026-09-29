import type { ReactElement, ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { useColors } from '../colors'
import { serif } from '../fonts'
import { useLayout } from '../layout'
import { useUi } from '../provider'

const PANEL_WIDTH = { regular: 420, wide: 480 } as const

interface PanelProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * The end-side pane Library and More open beside their list at `regular`
 * and `wide`: `border-s` so it mirrors under RTL, a serif title row with a
 * close button, then its own scrollable body. The host's `Screen` behind it
 * already carries the wash, so there is no gradient here.
 *
 * At `compact` this renders `children` full-width with no chrome at all, so
 * a host can render `<Panel>` unconditionally and let the layout decide
 * whether it is a pane or nothing.
 */
export function Panel({ title, onClose, children }: PanelProps): ReactElement {
  const layout = useLayout()
  const { strings } = useUi()
  const colors = useColors()

  const body = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-4">
      {children}
    </ScrollView>
  )

  if (layout === 'compact') return <View className="flex-1">{body}</View>

  return (
    <View
      className="border-s"
      style={{
        width: layout === 'wide' ? PANEL_WIDTH.wide : PANEL_WIDTH.regular,
        borderColor: colors.separator,
      }}>
      <View className="flex-row items-center justify-between p-4">
        <Text className="font-semibold text-lg" style={{ fontFamily: serif, color: colors.label }}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.panel.close}
          hitSlop={8}
          onPress={onClose}
          className="items-center justify-center rounded-full"
          style={{ width: 28, height: 28 }}>
          <Text style={{ color: colors.secondaryLabel, fontSize: 15 }}>✕</Text>
        </Pressable>
      </View>
      {body}
    </View>
  )
}
