import type { UserState } from '@ihsaanly/core/plan/user-state'
import { TrackingScreen } from '@ihsaanly/ui/screens/tracking'
import type { ReactElement } from 'react'
import { useOnboarding } from '@/onboarding/store'
import { setUserState, useUserState } from '@/plan/user-state-store'

export default function TrackingRoute(): ReactElement {
  const userState = useUserState()
  const onboarding = useOnboarding()

  return (
    <TrackingScreen
      userState={userState}
      // Offered unless it is known not to apply, so declining to answer costs nothing.
      showPause={onboarding.gender !== 'male'}
      onChange={(change: Partial<UserState>) => setUserState({ ...userState, ...change })}
    />
  )
}
