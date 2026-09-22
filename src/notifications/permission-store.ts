import { useEffect, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'

import { permissionStatus, type PermissionStatus } from './schedule'

const listeners = new Set<() => void>()
let status: PermissionStatus = 'undetermined'

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return (): void => {
    listeners.delete(listener)
  }
}

function current(): PermissionStatus {
  return status
}

export async function refreshPermissionStatus(): Promise<void> {
  const next = await permissionStatus()
  if (next === status) return
  status = next
  listeners.forEach((listener) => listener())
}

/**
 * The OS permission as the app last saw it. Refreshed on mount and whenever
 * the app returns to the foreground, which is when the user comes back from
 * system settings.
 */
export function usePermissionStatus(): PermissionStatus {
  useEffect(() => {
    void refreshPermissionStatus()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPermissionStatus()
    })
    return (): void => subscription.remove()
  }, [])

  return useSyncExternalStore(subscribe, current)
}
