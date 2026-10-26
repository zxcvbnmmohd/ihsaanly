import { useStrings } from '@ihsaanly/state/strings'
import type { ToastMessage } from '@ihsaanly/ui/components/toast'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

import { forgetRemoteMarks, undoRemoteMarks, useRemoteMarks } from './ledger'
import { remoteMarksMessage } from './message'

/** Longer than an in-app undo: this is news of something done elsewhere. */
export const REMOTE_MARK_TOAST_MS = 8000

export interface RemoteMarkToast {
  toast: ToastMessage | null
  onDismiss: () => void
}

interface Thing {
  active: boolean
}

/**
 * "Marked done from your widget · Undo": what widgets and notification
 * buttons marked while the app was closed, said once the app is in front.
 * Undo takes back exactly those marks; letting it time out forgets them.
 */
export function useRemoteMarkToast(): RemoteMarkToast {
  const [thing, setThing] = useState<Thing>({ active: AppState.currentState === 'active' })
  const strings = useStrings()
  const marks = useRemoteMarks()

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setThing({ active: state === 'active' })
    })
    return (): void => subscription.remove()
  }, [])

  const text = remoteMarksMessage(marks, strings)
  const last = marks.at(-1)
  const toast: ToastMessage | null =
    thing.active && text && last
      ? {
          id: `${marks.length}:${last.source}:${last.id}@${last.at}`,
          text,
          action: { label: strings.today.undo, onPress: () => undoRemoteMarks(marks) },
        }
      : null

  return { toast, onDismiss: () => forgetRemoteMarks(marks) }
}
