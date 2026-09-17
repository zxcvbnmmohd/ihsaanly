import type { ReactElement } from 'react'

import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import type { UserState } from '@/plan/user-state'
import { strings } from '@/strings'

export interface TrackingScreenProps {
  userState: UserState
  onChange: (change: Partial<UserState>) => void
}

export function TrackingScreen({ userState, onChange }: TrackingScreenProps): ReactElement {
  return (
    <Screen className="gap-3 p-4">
      <Row
        title={strings.tracking.travelling}
        detail={strings.tracking.travellingDetail}
        selected={userState.travelling}
        onPress={() => onChange({ travelling: !userState.travelling })}
      />
      <Row
        title={strings.tracking.paused}
        detail={strings.tracking.pausedDetail}
        selected={userState.trackingPaused}
        onPress={() => onChange({ trackingPaused: !userState.trackingPaused })}
      />
    </Screen>
  )
}
