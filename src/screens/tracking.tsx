import type { ReactElement } from 'react'

import { usePalette } from '@/theme/store'
import { Screen } from '@/components/screen'
import { SwitchRow } from '@/components/switch-row'
import type { UserState } from '@/plan/user-state'
import { useStrings } from '@/strings'

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
      {showPause ? (
        <SwitchRow
          title={strings.tracking.paused}
          detail={strings.tracking.pausedDetail}
          value={userState.trackingPaused}
          onValueChange={(trackingPaused) => onChange({ trackingPaused })}
          accent={palette.accent}
          knob={palette.knob}
          track={palette.wash[1]}
        />
      ) : null}
    </Screen>
  )
}
