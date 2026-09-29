import type { UserState } from '@ihsaanly/core/plan/user-state'
import { useOnboarding } from '@ihsaanly/state/onboarding/store'
import { setUserState, useUserState } from '@ihsaanly/state/plan/user-state-store'
import { useStrings } from '@ihsaanly/state/strings'
import { TrackingScreen } from '@ihsaanly/ui/screens/tracking'
import { createFileRoute } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { PageHeader } from '~/components/page-header'

export const Route = createFileRoute('/_more/tracking')({ component: TrackingRoute })

function TrackingRoute(): ReactElement {
  const strings = useStrings()
  const userState = useUserState()
  const onboarding = useOnboarding()

  return (
    <>
      <PageHeader title={strings.tracking.title} />
      <TrackingScreen
        userState={userState}
        showPause={onboarding.gender !== 'male'}
        onChange={(change: Partial<UserState>) => setUserState({ ...userState, ...change })}
      />
    </>
  )
}
