// Signing in from onboarding to restore an account that already exists. The
// decision (still syncing, restored, or an account that never finished setup)
// is @ihsaanly/state's `useRestoreOutcome`, shared with the web companion; what
// is native is the one thing a synced setup cannot carry to a new phone: the
// OS permission to deliver the reminders it has turned on.
import { useRestoreOutcome } from '@ihsaanly/state/cloud/restore'
import { getNotificationPreferences } from '@ihsaanly/state/notifications/store'
import { getStrings } from '@ihsaanly/state/strings'
import { type ReactElement, useEffect, useState } from 'react'
import { BackHandler, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MobileAccount } from '@/account/account'
import { ensurePermission, permissionStatus } from '@/notifications/schedule'

interface RestoreAccountProps {
  /** Back to the welcome step, signed in or not. */
  onBackToSetup: () => void
  /** The account never finished setup: on to the next step, still signed in. */
  onContinueSetup: () => void
  /** The account's setup is here; the app takes over from onboarding. */
  onRestored: () => void
}

interface Thing {
  /** Reminders arrived on, and this phone has never been asked to allow them. */
  askReminders: boolean
}

export function RestoreAccount({
  onBackToSetup,
  onContinueSetup,
  onRestored,
}: RestoreAccountProps): ReactElement {
  const [thing, setThing] = useState<Thing>({ askReminders: false })
  const outcome = useRestoreOutcome()
  const insets = useSafeAreaInsets()

  // There is no navigator under onboarding, so Android's Back is handled here.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackToSetup()
      return true
    })
    return (): void => subscription.remove()
  }, [onBackToSetup])

  // Permission is per device and never syncs. Asking is left to a button, as in
  // onboarding's reminders step; only "never asked" is worth the question —
  // granted needs nothing, and denied can only change in system settings.
  useEffect(() => {
    if (outcome !== 'restored') return
    const preferences = getNotificationPreferences()
    if (!(preferences.windows || preferences.lookAhead || preferences.prayers)) {
      onRestored()
      return
    }
    let cancelled = false
    void permissionStatus().then((status) => {
      if (cancelled) return
      if (status === 'undetermined') setThing({ askReminders: true })
      else onRestored()
    })
    return (): void => {
      cancelled = true
    }
  }, [outcome, onRestored])

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <MobileAccount
        restore={{
          outcome,
          onBackToSetup,
          onContinueSetup,
          reminders: thing.askReminders
            ? {
                onAllow: () => void ensurePermission(getStrings()).finally(onRestored),
                onNotNow: onRestored,
              }
            : undefined,
        }}
      />
    </View>
  )
}
