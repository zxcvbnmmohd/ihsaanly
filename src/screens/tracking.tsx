import type { ReactElement } from 'react'
import { Text, useColorScheme, View } from 'react-native'

import { ChoiceRow } from '@/components/choice-row'
import { usePalette } from '@/theme/store'
import { Screen } from '@/components/screen'
import { SwitchRow } from '@/components/switch-row'
import { JumuahChoice, type UserState } from '@/plan/user-state'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'

export interface TrackingScreenProps {
  userState: UserState
  showPause: boolean
  onChange: (change: Partial<UserState>) => void
}

export function TrackingScreen({
  userState,
  showPause,
  onChange,
}: TrackingScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Screen palette={palette} className="gap-3 p-4">
      <SwitchRow
        title={strings.tracking.travelling}
        detail={strings.tracking.travellingDetail}
        value={userState.travelling}
        onValueChange={(travelling) => onChange({ travelling })}
        accent={palette.accent}
        knob={palette.knob}
        track={palette.wash[1]}
      />

      <View className="gap-3 pt-3">
        <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
          {strings.tracking.jumuah}
        </Text>
        {JumuahChoice.options.map((option) => (
          <ChoiceRow
            key={option}
            title={strings.tracking.jumuahChoice[option]}
            detail={option === 'auto' ? strings.tracking.jumuahAutoDetail : null}
            selected={userState.jumuah === option}
            onPress={() => onChange({ jumuah: option })}
            accent={palette.accent}
          />
        ))}
      </View>

      {showPause ? (
        <View className="pt-3">
          <SwitchRow
            title={strings.tracking.paused}
            detail={strings.tracking.pausedDetail}
            value={userState.trackingPaused}
            onValueChange={(trackingPaused) => onChange({ trackingPaused })}
            accent={palette.accent}
            knob={palette.knob}
            track={palette.wash[1]}
          />
        </View>
      ) : null}
    </Screen>
  )
}
