import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { Button } from '../components/button'
import { Surface } from '../components/surface'
import { serif } from '../fonts'
import { useUi } from '../provider'
import type { TodayCheckIn } from '../types'

/** Where the prayer strip was, while prayer tracking is paused: a quiet line, not a warning. */
export function PausedNotice(): ReactElement {
  const colors = useColors()
  const { strings } = useUi()
  return (
    <View className="gap-1">
      <Text className="font-semibold text-base" style={{ color: colors.label }}>
        {strings.today.paused}
      </Text>
      <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
        {strings.today.pausedFasting}
      </Text>
    </View>
  )
}

export interface CheckInCardProps {
  checkIn: TodayCheckIn
}

/** The check-in the user asked for when pausing: resume, or not yet. */
export function CheckInCard({ checkIn }: CheckInCardProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]
  return (
    <Surface style={{ borderRadius: 20, padding: 18 }}>
      <View className="gap-3">
        <Text
          className="text-xl leading-tight"
          style={{ fontFamily: serif, color: colors.label, fontWeight: '600' }}>
          {strings.today.checkInTitle}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Button
            title={strings.today.resume}
            onPress={checkIn.onResume}
            color={palette.accent}
            onColor={palette.onAccent}
          />
          <Button
            title={strings.today.notYet}
            onPress={checkIn.onNotYet}
            variant="secondary"
            color={palette.accent}
          />
        </View>
      </View>
    </Surface>
  )
}
