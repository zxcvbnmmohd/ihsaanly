import { assertNever } from '@ihsaanly/core/assert-never'
import { PRAYERS } from '@ihsaanly/core/prayer/qada'
import { REMOTE_MARKS_KEY } from '@ihsaanly/state/cloud/keys'
import { uncompleteItem } from '@ihsaanly/state/plan/completions'
import { unmarkPrayer } from '@ihsaanly/state/prayer/marks'
import { addCount, currentPeriod } from '@ihsaanly/state/progress/store'
import { createPreferenceStore } from '@ihsaanly/state/storage/preference-store'
import { z } from 'zod'

/**
 * One mark made away from the app: by a widget (filed when the app takes the
 * taps in) or by a notification's action button. Enough is kept to take back
 * exactly that mark: the moment it was filed at, and the zone its day was
 * worked out in, so the undo lands on the same day even after midnight.
 */
const RemoteMark = z.object({
  source: z.enum(['widget', 'notification']),
  /** `done` completed an item, `prayer` marked a prayer, `count` added to a tasbih. */
  kind: z.enum(['done', 'prayer', 'count']),
  /** The item, or the prayer. */
  id: z.string(),
  at: z.number(),
  timeZone: z.string(),
  /** For `count`: how many were added, and to which period's progress. */
  counted: z.number().int().positive().optional(),
  periodKey: z.string().optional(),
})
export type RemoteMark = z.infer<typeof RemoteMark>

/** More than this is not news any more; the oldest go first. */
const KEEP = 50

const store = createPreferenceStore(REMOTE_MARKS_KEY, z.array(RemoteMark), [])

/** The marks made away from the app that it has not yet shown, oldest first. */
export const useRemoteMarks = store.use
export const getRemoteMarks = store.get

/** Notes marks made away from the app, for the next time it is open to say so. */
export function noteRemoteMarks(marks: RemoteMark[]): void {
  if (marks.length === 0) return
  store.set([...store.get(), ...marks].slice(-KEEP))
}

/** Forgets the given marks (all of them by default) once they have been shown. */
export function forgetRemoteMarks(marks: readonly RemoteMark[] = store.get()): void {
  const gone = new Set(marks)
  store.set(store.get().filter((mark) => !gone.has(mark)))
}

/**
 * Takes back exactly these marks, newest first, as the app's own unmark
 * would: the completion or the prayer is unmarked on the day it was filed,
 * and counts still in their period come off the progress. Then forgets them.
 */
export function undoRemoteMarks(marks: readonly RemoteMark[]): void {
  for (const mark of [...marks].reverse()) {
    const at = new Date(mark.at)
    switch (mark.kind) {
      case 'done':
        uncompleteItem(mark.id, at, mark.timeZone)
        break
      case 'prayer': {
        const prayer = PRAYERS.find((known) => known === mark.id)
        if (prayer) unmarkPrayer(prayer, at, mark.timeZone)
        break
      }
      case 'count':
        if (mark.counted && mark.periodKey === currentPeriod(mark.id)) {
          addCount(mark.id, -mark.counted)
        }
        break
      default:
        return assertNever(mark.kind)
    }
  }
  forgetRemoteMarks(marks)
}
