import { getOnboarding } from '@ihsaanly/state/onboarding/store'
import { createFileRoute, redirect } from '@tanstack/react-router'

// `/` is only a door: into the app once onboarding is done, else into its first step.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: getOnboarding().completed ? '/today' : '/onboarding/$step',
      params: { step: 'welcome' },
      replace: true,
    })
  },
})
