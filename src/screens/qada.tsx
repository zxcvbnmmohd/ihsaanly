import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { Button } from '@/components/button'
import { Screen } from '@/components/screen'
import { Stepper } from '@/components/stepper'
import { Surface } from '@/components/surface'
import { Wash } from '@/components/wash'
import type { Prayer } from '@/prayer/qada'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { fonts } from '@/theme/fonts'
import { usePalette } from '@/theme/store'

export interface QadaRow {
  prayer: Prayer
  /** What is still owed, all sources combined. */
  outstanding: number
  /** Owed from before tracking began. Written as it changes. */
  owed: number
  /** Made up but not yet recorded; recorded in one go. */
  pending: number
}

export interface QadaScreenProps {
  rows: QadaRow[]
  onOwedChange: (prayer: Prayer, value: number) => void
  onPendingChange: (prayer: Prayer, value: number) => void
  onRecord: (prayer: Prayer) => void
}

/** A count per prayer and two ways to move it. Never a list, never a date, never the word "missed". */
export function QadaScreen({
  rows,
  onOwedChange,
  onPendingChange,
  onRecord,
}: QadaScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <View className="flex-1" style={{ backgroundColor: colors.systemBackground }}>
      <Wash palette={palette} />
      <Screen className="gap-4 p-4">
        <Text className="text-base leading-relaxed" style={{ color: colors.secondaryLabel }}>
          {strings.qada.intro}
        </Text>

        {rows.map((row) => (
          <Surface key={row.prayer} style={{ borderRadius: 24, padding: 20 }}>
            <View className="gap-4">
              <View className="flex-row items-baseline justify-between">
                <Text
                  className="text-2xl"
                  style={{ color: colors.label, fontFamily: fonts.display, fontWeight: '600' }}>
                  {strings.prayer[row.prayer]}
                </Text>
                <Text className="text-base" style={{ color: colors.secondaryLabel }}>
                  {row.outstanding > 0
                    ? strings.qada.outstanding(row.outstanding)
                    : strings.qada.none}
                </Text>
              </View>
              <Stepper
                label={strings.qada.owed}
                value={row.owed}
                onChange={(value) => onOwedChange(row.prayer, value)}
                palette={palette}
              />
              <Stepper
                label={strings.qada.madeUp}
                value={row.pending}
                onChange={(value) => onPendingChange(row.prayer, value)}
                palette={palette}
              />
              {row.pending > 0 ? (
                <Button
                  title={strings.qada.record(row.pending)}
                  onPress={() => onRecord(row.prayer)}
                  color={palette.accent}
                  onColor={palette.onAccent}
                />
              ) : null}
            </View>
          </Surface>
        ))}
      </Screen>
    </View>
  )
}
