'use no memo'

import type { ReactElement } from 'react'

import {
  Caption,
  DETAIL_ROW_HEIGHT,
  Frame,
  LinkList,
  ROW_HEIGHT,
  Secondary,
  rowsFit,
  type WidgetProps,
} from './parts'

/** Today's all-day items, as many as fit. */
export function AlsoTodayWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels } = model
  const large = layout.size === 'large'
  const limit =
    layout.size === 'compact' ? 1 : rowsFit(layout, large ? DETAIL_ROW_HEIGHT : ROW_HEIGHT)
  return (
    <Frame model={model} paint={paint} url={null} label={labels.alsoToday}>
      <Caption text={labels.alsoToday} paint={paint} rtl={rtl} />
      {model.allDay.length === 0 ? (
        <Secondary text={labels.nothingNow} paint={paint} rtl={rtl} maxLines={2} />
      ) : (
        <LinkList links={model.allDay} paint={paint} rtl={rtl} limit={limit} showDetail={large} />
      )}
    </Frame>
  )
}
