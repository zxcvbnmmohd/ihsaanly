// The native-only half of onboarding: asking the device for a location fix
// and, before advancing off the reminders step, asking the OS for permission
// to deliver them. Everything else — store reads/writes, step state, and the
// props OnboardingScreen renders — lives in
// @ihsaanly/state/onboarding/use-onboarding-flow, shared with the web
// companion (see apps/companion/src/onboarding/flow.tsx), which has neither.
import { useOnboardingFlow } from '@ihsaanly/state/onboarding/use-onboarding-flow'
import { getStrings } from '@ihsaanly/state/strings'
import { OnboardingScreen } from '@ihsaanly/ui/screens/onboarding'
import type { ReactElement } from 'react'
import { requestDeviceLocation } from '@/location/device'
import { ensurePermission } from '@/notifications/schedule'
import { setThemePreference, useThemePreference } from '@/theme/store'

export function OnboardingFlow(): ReactElement {
  const theme = useThemePreference()
  const props = useOnboardingFlow({
    theme,
    onSelectTheme: setThemePreference,
    requestDeviceLocation,
    ensureReminderPermission: () => ensurePermission(getStrings()).then(() => undefined),
  })

  return <OnboardingScreen {...props} />
}
