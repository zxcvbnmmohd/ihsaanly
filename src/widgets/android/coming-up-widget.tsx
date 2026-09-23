'use no memo'

import type { ReactElement } from 'react'

import {
  Caption,
  DETAIL_ROW_HEIGHT,
  Frame,
  Headline,
  LinkList,
  Secondary,
  rowsFit,
  type WidgetProps,
} from './parts'

/** Upcoming items with when they fall. */
export function ComingUpWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels, comingUp } = model
  const first = comingUp[0]
  if (!first) {
    return (
      <Frame model={model} paint={paint} url={null} label={labels.comingUp}>
        <Caption text={labels.comingUp} paint={paint} rtl={rtl} />
        <Secondary text={labels.nothingNow} paint={paint} rtl={rtl} maxLines={2} />
      </Frame>
    )
  }
  if (layout.size === 'compact') {
    return (
      <Frame model={model} paint={paint} url={first.url} label={first.title}>
        <Caption text={labels.comingUp} paint={paint} rtl={rtl} />
        <Headline text={first.title} paint={paint} rtl={rtl} fontSize={15} />
        {first.detail ? <Secondary text={first.detail} paint={paint} rtl={rtl} /> : null}
      </Frame>
    )
  }
  return (
    <Frame model={model} paint={paint} url={null} label={labels.comingUp}>
      <Caption text={labels.comingUp} paint={paint} rtl={rtl} />
      <LinkList
        links={comingUp}
        paint={paint}
        rtl={rtl}
        limit={rowsFit(layout, DETAIL_ROW_HEIGHT)}
        showDetail
      />
    </Frame>
  )
}
