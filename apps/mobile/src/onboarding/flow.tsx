// The native-only half of onboarding: asking the device for a location fix
// and, before advancing off the reminders step, asking the OS once for
// permission to show notifications, then turning on announcements if they
// were chosen (the same path as the More → Reminders switch). Everything else — store reads/writes, step state, and the
// props OnboardingScreen renders — lives in
// @ihsaanly/state/onboarding/use-onboarding-flow, shared with the web
// companion (see apps/companion/src/onboarding/flow.tsx), which has neither.
import { useOnboardingFlow } from '@ihsaanly/state/onboarding/use-onboarding-flow'
import { getStrings } from '@ihsaanly/state/strings'
import { OnboardingScreen } from '@ihsaanly/ui/screens/onboarding'
import type { ReactElement } from 'react'
import { RestoreAccount } from '@/account/restore'
import { requestDeviceLocation } from '@/location/device'
import { ensurePermission } from '@/notifications/schedule'
import { setAnnouncementsEnabled } from '@/push/announcements'
import { setThemePreference, useThemePreference } from '@/theme/store'

interface OnboardingFlowProps {
  /** Showing sign-in for an existing account in place of the steps. */
  restoring: boolean
  /** Opens that sign-in; omitted in a build without the cloud, which hides it. */
  onRestore: (() => void) | undefined
  /** Leaves it: back to the steps, or (`restored`) on into the app. */
  onRestoreEnd: () => void
}

export function OnboardingFlow({
  restoring,
  onRestore,
  onRestoreEnd,
}: OnboardingFlowProps): ReactElement {
  const theme = useThemePreference()
  const props = useOnboardingFlow({
    theme,
    onSelectTheme: setThemePreference,
    requestDeviceLocation,
    ensureReminderPermission: () => ensurePermission(getStrings()),
    // Already granted by then, so this asks nothing more of the OS.
    enableAnnouncements: () => setAnnouncementsEnabled(true, getStrings()),
  })

  // The flow stays mounted under the sign-in, so its step is where it was.
  if (restoring) {
    return (
      <RestoreAccount
        onBackToSetup={onRestoreEnd}
        onContinueSetup={() => {
          onRestoreEnd()
          props.onNext()
        }}
        onRestored={onRestoreEnd}
      />
    )
  }

  return <OnboardingScreen {...props} onRestore={onRestore} />
}
