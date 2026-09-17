import type { ReactElement } from 'react'

import type { UserState } from '@/plan/user-state'
import { useOnboarding } from '@/onboarding/store'
import { setUserState, useUserState } from '@/plan/user-state-store'
import { TrackingScreen } from '@/screens/tracking'

export default function TrackingRoute(): ReactElement {
  const userState = useUserState()
  const onboarding = useOnboarding()

  return (
    <TrackingScreen
      userState={userState}
      showPause={onboarding.gender === 'female'}
      onChange={(change: Partial<UserState>) => setUserState({ ...userState, ...change })}
    />
  )
}
