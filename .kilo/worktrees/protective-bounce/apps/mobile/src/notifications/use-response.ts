import { useEffect } from 'react'

import './background-task'
import { handleResponse } from './respond'
import { notifications } from './schedule'

/**
 * Answers taps on reminders. Mounted once in the root layout; `enabled` is
 * false during onboarding, when there is nowhere to navigate to yet.
 *
 * Cold start: the response that launched the app is read once and cleared,
 * so a remount never routes twice. Warm: the listener fires as they arrive.
 */
export function useNotificationResponse(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let remove: (() => void) | null = null

    const start = async (): Promise<void> => {
      const api = await notifications()
      if (!api || cancelled) return

      api.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      })

      const last = await api.getLastNotificationResponseAsync()
      if (last && !cancelled) {
        await handleResponse(last)
        await api.clearLastNotificationResponseAsync()
      }

      const subscription = api.addNotificationResponseReceivedListener((response) => {
        void handleResponse(response)
      })
      remove = (): void => subscription.remove()
    }

    void start()

    return (): void => {
      cancelled = true
      remove?.()
    }
  }, [enabled])
}
