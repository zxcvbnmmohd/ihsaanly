import { JumuahChoice, type UserState } from '@ihsaanly/core/plan/user-state'
import { palettes } from '@ihsaanly/tailwind/tokens'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'
import { useColors } from '../colors'
import { ChoiceRow } from '../components/choice-row'
import { Screen } from '../components/screen'
import { Stepper } from '../components/stepper'
import { SwitchRow } from '../components/switch-row'
import { useUi } from '../provider'
import { CHECK_IN_DAYS } from '../types'

export interface TrackingScreenProps {
  userState: UserState
  showPause: boolean
  onChange: (change: Partial<UserState>) => void
  /**
   * While paused: remind the user to check in after about this many days
   * (`CHECK_IN_DAYS.min`–`max`), or null for no reminder.
   */
  checkInDays: number | null
  onCheckInDays: (days: number | null) => void
}

export function TrackingScreen({
  userState,
  showPause,
  onChange,
  checkInDays,
  onCheckInDays,
}: TrackingScreenProps): ReactElement {
  const colors = useColors()
  const { strings, scheme } = useUi()
  const palette = palettes[scheme]

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
        <Text
          accessibilityRole="header"
          aria-level={2}
          className="font-semibold text-xs uppercase"
          style={{ color: colors.secondaryLabel }}>
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
        <View className="gap-3 pt-3">
          <SwitchRow
            title={strings.tracking.paused}
            detail={strings.tracking.pausedDetail}
            value={userState.trackingPaused}
            onValueChange={(trackingPaused) => onChange({ trackingPaused })}
            accent={palette.accent}
            knob={palette.knob}
            track={palette.wash[1]}
          />
          {userState.trackingPaused ? (
            <>
              <SwitchRow
                title={strings.tracking.checkIn}
                detail={
                  checkInDays === null
                    ? strings.tracking.checkInOff
                    : strings.tracking.checkInAfter(checkInDays)
                }
                value={checkInDays !== null}
                onValueChange={(on) => onCheckInDays(on ? CHECK_IN_DAYS.initial : null)}
                accent={palette.accent}
                knob={palette.knob}
                track={palette.wash[1]}
              />
              {checkInDays === null ? null : (
                <Stepper
                  label={strings.tracking.checkInDays}
                  value={checkInDays}
                  min={CHECK_IN_DAYS.min}
                  max={CHECK_IN_DAYS.max}
                  onChange={onCheckInDays}
                  palette={palette}
                />
              )}
            </>
          ) : null}
        </View>
      ) : null}
    </Screen>
  )
}
