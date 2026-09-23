'use no memo'

import type { ReactElement } from 'react'

import {
  Caption,
  Frame,
  Headline,
  LinkList,
  ROW_HEIGHT,
  Secondary,
  rowsFit,
  type WidgetProps,
} from './parts'

/** The window's headline and the one thing it asks; what else is open when there is room. */
export function RightNowWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels } = model
  const caption = model.window ?? labels.rightNow
  const title = model.rightNow?.title ?? labels.nothingNow
  const large = layout.size === 'large'
  return (
    <Frame model={model} paint={paint} url={model.rightNow?.url ?? null} label={title}>
      <Caption text={caption} paint={paint} rtl={rtl} />
      <Headline
        text={title}
        paint={paint}
        rtl={rtl}
        fontSize={layout.size === 'compact' ? 15 : large ? 22 : 19}
        maxLines={layout.size === 'compact' ? 2 : 3}
      />
      {layout.size !== 'compact' && model.rightNow?.detail ? (
        <Secondary text={model.rightNow.detail} paint={paint} rtl={rtl} />
      ) : null}
      {large && model.alsoNow.length > 0 ? (
        <LinkList
          links={model.alsoNow}
          paint={paint}
          rtl={rtl}
          limit={rowsFit(layout, ROW_HEIGHT, 70)}
        />
      ) : null}
    </Frame>
  )
}
