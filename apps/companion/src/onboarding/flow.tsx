// The web-only half of onboarding: asking the browser for a location fix, and
// keeping the step in the URL (/onboarding/<step>) instead of in state. There
// is no OS reminders permission to ask (`capabilities.reminders` is off on
// web), so `ensureReminderPermission` is left out and the shared flow advances
// straight past that prompt and shows no notification preview; and no
// widgets, so that step is left out. Everything else — store reads/writes and the
// props OnboardingScreen renders — lives in
// @ihsaanly/state/onboarding/use-onboarding-flow, shared with the mobile app
// (see apps/mobile/src/onboarding/flow.tsx).
import { onboardingSteps, useOnboardingFlow } from '@ihsaanly/state/onboarding/use-onboarding-flow'
import { OnboardingScreen, type OnboardingStep } from '@ihsaanly/ui/screens/onboarding'
import { useNavigate } from '@tanstack/react-router'
import type { ReactElement } from 'react'
import { cloudEnabled } from '~/cloud'
import { requestDeviceLocation } from '~/platform/location'
import { setThemePreference, useThemePreference } from '~/theme/store'

/** The web's steps: no widget step, since a browser has no Home Screen to offer. */
export const WEB_STEPS = onboardingSteps(false)

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
      index: WEB_STEPS.indexOf(step),
      go: (index) => {
        const to = WEB_STEPS[index] ?? 'welcome'
        void navigate({ to: '/onboarding/$step', params: { step: to } })
      },
    },
    // Replace, so Back from Today (or a setting the summary opened) does not
    // return into a finished flow. The web has no widgets, so no gallery.
    onComplete: (destination) =>
      void navigate({
        to: destination === undefined || destination === '/widgets' ? '/today' : destination,
        replace: true,
      }),
  })

  // Someone with an account signs in instead; their synced setup replaces this flow.
  const restore = (): void => void navigate({ to: '/account', search: { from: 'onboarding' } })

  return <OnboardingScreen {...props} onRestore={cloudEnabled ? restore : undefined} />
}
