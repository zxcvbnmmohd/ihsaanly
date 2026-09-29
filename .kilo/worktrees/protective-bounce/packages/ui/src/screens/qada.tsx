import type { Prayer } from '@ihsaanly/core/prayer/qada'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Screen } from '../components/screen'
import { Stepper } from '../components/stepper'
import { Surface } from '../components/surface'
import { serif } from '../fonts'
import { useUi } from '../provider'

export interface QadaRow {
  prayer: Prayer
  /** What is still owed, all sources combined. */
  outstanding: number
  /** Owed from before tracking began. Written as it changes. */
  owed: number
  /** Made up but not yet recorded; recorded in one go. */
  pending: number
}

export interface FastsRow {
  /** What is still owed, all sources combined. */
  outstanding: number
  /** Owed from before tracking began. Written as it changes. */
  owed: number
}

export interface QadaScreenProps {
  rows: QadaRow[]
  fasts: FastsRow
  onFastsOwedChange: (value: number) => void
  onRecordFastMadeUp: () => void
  onOwedChange: (prayer: Prayer, value: number) => void
  onPendingChange: (prayer: Prayer, value: number) => void
  onRecord: (prayer: Prayer) => void
}

/** A count per prayer and two ways to move it. Never a list, never a date, never the word "missed". */
export function QadaScreen({
  rows,
  fasts,
  onFastsOwedChange,
  onRecordFastMadeUp,
  onOwedChange,
  onPendingChange,
  onRecord,
}: QadaScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

  return (
    <Screen palette={palette} className="gap-4 p-4">
      <Text className="text-base leading-relaxed" style={{ color: colors.secondaryLabel }}>
        {strings.qada.intro}
      </Text>

      {rows.map((row) => (
        <Surface key={row.prayer} style={{ borderRadius: 24, padding: 20 }}>
          <View className="gap-4">
            <View className="flex-row items-baseline justify-between">
              <Text
                className="font-semibold text-2xl"
                style={{ fontFamily: serif, color: colors.label }}>
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

      <Surface style={{ borderRadius: 24, padding: 20 }}>
        <View className="gap-4">
          <View className="flex-row items-baseline justify-between">
            <Text
              className="font-semibold text-2xl"
              style={{ fontFamily: serif, color: colors.label }}>
              {strings.fasting.title}
            </Text>
            <Text className="text-base" style={{ color: colors.secondaryLabel }}>
              {fasts.outstanding > 0
                ? strings.fasting.outstanding(fasts.outstanding)
                : strings.fasting.none}
            </Text>
          </View>
          <Text className="text-sm leading-relaxed" style={{ color: colors.secondaryLabel }}>
            {strings.fasting.intro}
          </Text>
          <Stepper
            label={strings.fasting.owed}
            value={fasts.owed}
            onChange={onFastsOwedChange}
            palette={palette}
          />
          <Button
            title={strings.fasting.recordMadeUp}
            onPress={onRecordFastMadeUp}
            disabled={fasts.outstanding === 0}
            variant="secondary"
            color={palette.accent}
          />
        </View>
      </Surface>
    </Screen>
  )
}
