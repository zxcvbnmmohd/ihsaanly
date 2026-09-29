// The web-only half of onboarding: asking the browser for a location fix, and
// keeping the step in the URL (/onboarding/<step>) instead of in state. There
// is no OS reminders permission to ask (`capabilities.reminders` is off on
// web), so `ensureReminderPermission` is left out and the shared flow advances
// straight past that prompt. Everything else — store reads/writes and the
// props OnboardingScreen renders — lives in
// @ihsaanly/state/onboarding/use-onboarding-flow, shared with the mobile app
// (see apps/mobile/src/onboarding/flow.tsx).
import { ONBOARDING_STEPS, useOnboardingFlow } from '@ihsaanly/state/onboarding/use-onboarding-flow'
import { OnboardingScreen, type OnboardingStep } from '@ihsaanly/ui/screens/onboarding'
import { useNavigate } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { requestDeviceLocation } from '~/platform/location'
import { setThemePreference, useThemePreference } from '~/theme/store'

interface OnboardingFlowProps {
  step: OnboardingStep
}

export function OnboardingFlow({ step }: OnboardingFlowProps): ReactElement {
  const theme = useThemePreference()
  const navigate = useNavigate()
  const props = useOnboardingFlow({
    theme,
    onSelectTheme: setThemePreference,
    requestDeviceLocation,
    stepControl: {
      index: ONBOARDING_STEPS.indexOf(step),
      go: (index) => {
        const to = ONBOARDING_STEPS[index] ?? 'welcome'
        void navigate({ to: '/onboarding/$step', params: { step: to } })
      },
    },
    // Replace, so Back from Today does not return into a finished flow.
    onComplete: () => void navigate({ to: '/today', replace: true }),
  })

  return <OnboardingScreen {...props} />
}
