import type { ReactElement } from 'react'

import type { UserState } from '@/plan/user-state'
import { setUserState, useUserState } from '@/plan/user-state-store'
import { TrackingScreen } from '@/screens/tracking'

export default function TrackingRoute(): ReactElement {
  const userState = useUserState()

  return (
    <TrackingScreen
      userState={userState}
      onChange={(change: Partial<UserState>) => setUserState({ ...userState, ...change })}
    />
  )
}
