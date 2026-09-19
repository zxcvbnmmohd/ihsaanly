import type { ReactElement } from 'react'

import { itemById, resolveText } from '@/content'
import { daysActive, summarise } from '@/plan/history'
import { HistoryScreen } from '@/screens/history'
import { useStrings } from '@/strings'
import { useActions } from '@/storage/events'

export default function HistoryRoute(): ReactElement {
  const strings = useStrings()
  const actions = useActions()

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
