import type { ReactElement } from 'react'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
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
  return (
    <Screen className="gap-3 p-4">
      <Row
        title={strings.tracking.travelling}
        detail={strings.tracking.travellingDetail}
        selected={userState.travelling}
        onPress={() => onChange({ travelling: !userState.travelling })}
      />
      {showPause ? (
        <Row
          title={strings.tracking.paused}
          detail={strings.tracking.pausedDetail}
          selected={userState.trackingPaused}
          onPress={() => onChange({ trackingPaused: !userState.trackingPaused })}
        />
      ) : null}
    </Screen>
  )
}
