import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors } from '../colors'
import { Surface } from '../components/surface'
import { useUi } from '../provider'
import type { PrayerEntry } from '../screens/today'

export interface PrayerStripProps {
  prayers: PrayerEntry[]
  names: Record<Prayer, string>
  onMark: (prayer: Prayer) => void
}

/** Five marks in a row: the whole day's prayers readable at a glance. */
export function PrayerStrip({ prayers, names, onMark }: PrayerStripProps): ReactElement {
  const colors = useColors()
  const palette = palettes[useUi().scheme]
  return (
    <View className="flex-row gap-2">
      {prayers.map((entry) => (
        <Pressable
          key={entry.prayer}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: entry.done }}
          // react-native-web reads only the aria-* form.
          aria-checked={entry.done}
          accessibilityLabel={names[entry.prayer]}
          onPress={() => onMark(entry.prayer)}
          testID={`prayer-${entry.prayer}`}
          className="flex-1">
          <Surface interactive style={{ borderRadius: 16, paddingVertical: 14 }}>
            <View className="items-center gap-2">
              <View
                className="items-center justify-center rounded-full"
                style={{
                  ...(entry.done
                    ? { borderColor: palette.accent, backgroundColor: palette.accent }
                    : { borderColor: colors.separator }),
                  width: 26,
                  height: 26,
                  borderWidth: 2,
                  // Passed and unmarked is quieter than still to come, so the
                  // strip reads as a day rather than five identical buttons.
                  borderStyle: entry.passed && !entry.done ? 'dashed' : 'solid',
                  opacity: entry.passed && !entry.done ? 0.6 : 1,
                }}>
                {entry.done ? (
                  <Text style={{ color: palette.onAccent, fontSize: 13, lineHeight: 16 }}>✓</Text>
                ) : null}
              </View>
              <Text
                className="font-semibold text-xs"
                style={{ color: entry.done ? colors.label : colors.secondaryLabel }}
                numberOfLines={1}>
                {names[entry.prayer]}
              </Text>
            </View>
          </Surface>
        </Pressable>
      ))}
    </View>
  )
}
