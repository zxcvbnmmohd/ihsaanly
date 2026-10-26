import type { ReactElement } from 'react'
import { Toast } from '../components/toast'
import { useUi } from '../provider'
import type { TodayUndo } from '../types'

export interface UndoBarProps {
  undo: TodayUndo | null
  /** Called once the bar has been up for `UNDO_MS` without Undo. */
  onDismiss: () => void
}

/** "Marked done · Undo" along the bottom for a few seconds after a mark on Today. */
export function UndoBar({ undo, onDismiss }: UndoBarProps): ReactElement {
  const { strings } = useUi()
  return (
    <Toast
      toast={
        undo
          ? {
              id: undo.id,
              text: strings.today.markedDone,
              action: {
                label: strings.today.undo,
                accessibilityLabel: strings.today.undoItem(undo.title),
                onPress: undo.onUndo,
              },
            }
          : null
      }
      onDismiss={onDismiss}
    />
  )
}
