import { itemById, resolveText } from '@ihsaanly/core/content'
import { daysActive, summarise, withoutRetracted } from '@ihsaanly/core/plan/history'
import { useActions } from '@ihsaanly/state/storage/events'
import { useStrings } from '@ihsaanly/state/strings'
import { HistoryScreen } from '@ihsaanly/ui/screens/history'
import type { ReactElement } from 'react'

export default function HistoryRoute(): ReactElement {
  const strings = useStrings()
  const actions = withoutRetracted(useActions(), [
    ['prayer-performed', 'prayer-unmarked'],
    ['item-completed', 'item-uncompleted'],
  ])

  const labelFor = (subject: string): string => {
    const item = itemById(subject)
    if (item) return resolveText(item.title) ?? subject
    return strings.prayer[subject as keyof typeof strings.prayer] ?? subject
  }

  return (
    <HistoryScreen
      daysActive={daysActive(actions)}
      prayers={summarise(actions, 'prayer-performed')}
      items={summarise(actions, 'item-completed')}
      labelFor={labelFor}
    />
  )
}
