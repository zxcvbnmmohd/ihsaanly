import { assertNever } from '@ihsaanly/core/assert-never'
import type { Prayer } from '@ihsaanly/core/prayer/qada'
import type { Strings } from '@ihsaanly/core/strings/en'

import type { RemoteMark } from './ledger'

function prayerName(id: string, strings: Strings): string {
  return id in strings.prayer ? strings.prayer[id as Prayer] : id
}

/**
 * What the toast says about marks made away from the app: the one mark by
 * name ("Asr marked from a notification"), or several by number and where
 * they came from ("3 marked from your widgets"). Null when there are none.
 */
export function remoteMarksMessage(marks: readonly RemoteMark[], strings: Strings): string | null {
  const [only, ...rest] = marks
  if (!only) return null
  const copy = strings.remoteMarks
  if (rest.length === 0) {
    const fromWidget = only.source === 'widget'
    switch (only.kind) {
      case 'done':
        return fromWidget ? copy.doneFromWidget : copy.doneFromNotification
      case 'prayer': {
        const name = prayerName(only.id, strings)
        return fromWidget ? copy.prayerFromWidget(name) : copy.prayerFromNotification(name)
      }
      case 'count':
        return copy.countedFromWidget(only.counted ?? 1)
      default:
        return assertNever(only.kind)
    }
  }
  const sources = new Set(marks.map((mark) => mark.source))
  if (sources.size > 1) return copy.manyFromBoth(marks.length)
  return sources.has('widget')
    ? copy.manyFromWidgets(marks.length)
    : copy.manyFromNotifications(marks.length)
}
