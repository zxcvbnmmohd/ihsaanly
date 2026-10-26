import { getOnboarding } from '@ihsaanly/state/onboarding/store'
import type { OnboardingStep } from '@ihsaanly/ui/screens/onboarding'
import { createFileRoute, redirect } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { OnboardingFlow, WEB_STEPS } from '~/onboarding/flow'

function isStep(value: string): value is OnboardingStep {
  return (WEB_STEPS as string[]).includes(value)
}

// One URL per step, so Back, Forward and reload move through the flow like pages.
export const Route = createFileRoute('/onboarding/$step')({
  beforeLoad: ({ params }) => {
    if (getOnboarding().completed) throw redirect({ to: '/today', replace: true })
    if (!isStep(params.step))
      throw redirect({ to: '/onboarding/$step', params: { step: 'welcome' }, replace: true })
  },
  component: OnboardingStepRoute,
})

function OnboardingStepRoute(): ReactElement {
  const { step } = Route.useParams()
  return <OnboardingFlow step={isStep(step) ? step : 'welcome'} />
}
