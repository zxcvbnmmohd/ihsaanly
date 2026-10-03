import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Sheet } from '../components/sheet'
import { onSpace } from '../components/space-press'
import { useUi } from '../provider'
import type { PartsPanel as PartsPanelValue } from '../types'

export interface PartsPanelProps {
  panel: PartsPanelValue
  onTogglePart: (itemId: string, partId: string) => void
  onMarkAll: (itemId: string) => void
  onClose: () => void
}

/** An item done in parts, as a checklist in a sheet, with how many are done. */
export function PartsPanel({
  panel,
  onTogglePart,
  onMarkAll,
  onClose,
}: PartsPanelProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  const { itemId, title, parts } = panel
  const done = parts.filter((part) => part.done).length

  return (
    <Sheet title={title} onClose={onClose}>
      <Text
        accessibilityLiveRegion="polite"
        aria-live="polite"
        className="text-sm"
        style={{ color: colors.secondaryLabel }}>
        {strings.panel.progress(done, parts.length)}
      </Text>
      <ScrollView style={{ maxHeight: 360 }} contentContainerClassName="gap-1">
        {parts.map((part) => (
          <Pressable
            key={part.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: part.done }}
            aria-checked={part.done}
            accessibilityLabel={part.title}
            onPress={() => onTogglePart(itemId, part.id)}
            // A checkbox toggles on Space; react-native-web only answers Enter here.
            onKeyDown={onSpace(() => onTogglePart(itemId, part.id))}
            className="flex-row items-center gap-3 py-2"
            style={{ minHeight: 44 }}>
            <View
              className="items-center justify-center rounded-md"
              style={{
                width: 24,
                height: 24,
                borderWidth: 2,
                ...(part.done
                  ? { borderColor: palette.accent, backgroundColor: palette.accent }
                  : { borderColor: colors.fieldBorder }),
              }}>
              {part.done ? (
                <Text
                  aria-hidden
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={{ color: palette.onAccent, fontSize: 13, lineHeight: 16 }}>
                  ✓
                </Text>
              ) : null}
            </View>
            <Text className="flex-1 text-base" style={{ color: colors.label }}>
              {part.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
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
