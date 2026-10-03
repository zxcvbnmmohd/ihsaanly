import { getAnnouncements } from '@ihsaanly/state/opt-ins/store'

type MessagingModule = typeof import('@react-native-firebase/messaging')

/**
 * Firebase hands Android messages that arrive while the app is in the
 * background to a headless task, and warns when nothing is registered for it.
 * Announcements are shown by the system and need no work here, so the handler
 * does nothing; it exists so the task has somewhere to go. Defined from the
 * app entry, like the other background tasks, and only for someone opted in
 * (one who opts in mid-session gets it from the next launch). `load` is
 * replaceable for tests.
 */
export async function registerBackgroundPush(
  load: () => Promise<MessagingModule> = () => import('@react-native-firebase/messaging'),
): Promise<void> {
  // Never opted in: nothing can arrive, and Firebase stays untouched.
  const { enabled, subscribed } = getAnnouncements()
  if (!enabled && subscribed === null) return
  try {
    const module = await load()
    module.setBackgroundMessageHandler(module.getMessaging(), async () => {})
  } catch {
    // No native Firebase in this build; there is no background task to serve.
  }
}

void registerBackgroundPush()
