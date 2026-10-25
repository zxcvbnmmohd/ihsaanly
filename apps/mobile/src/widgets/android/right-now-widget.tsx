'use no memo'

import type { ReactElement } from 'react'
import { FlexWidget } from 'react-native-android-widget'

import {
  Caption,
  Frame,
  Headline,
  LinkList,
  ROW_HEIGHT,
  rowsFit,
  Secondary,
  type WidgetProps,
} from './parts'

/**
 * The window's headline and the one thing it asks, how long the moment stays
 * open, what else is open, and the Hijri date at the foot. Marking done stays
 * in the app here: Android widgets only open links.
 */
export function RightNowWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels } = model
  const caption = model.window ?? labels.rightNow
  const title = model.rightNow?.title ?? labels.nothingNow
  const compact = layout.size === 'compact'
  const large = layout.size === 'large'
  return (
    <Frame model={model} paint={paint} url={model.rightNow?.url ?? null} label={title}>
      <Caption text={caption} paint={paint} rtl={rtl} />
      <Headline
        text={title}
        paint={paint}
        rtl={rtl}
        fontSize={compact ? 15 : large ? 22 : 19}
        maxLines={compact ? 2 : 3}
      />
      {!compact && model.rightNow?.detail ? (
        <Secondary text={model.rightNow.detail} paint={paint} rtl={rtl} />
      ) : null}
      {!compact && model.rightNow && model.remaining ? (
        <Secondary text={model.remaining} paint={paint} rtl={rtl} />
      ) : null}
      {large && model.alsoNow.length > 0 ? (
        <LinkList
          links={model.alsoNow}
          paint={paint}
          rtl={rtl}
          limit={rowsFit(layout, ROW_HEIGHT, 110)}
        />
      ) : null}
      {!compact && !large && model.moreNow ? (
        <Caption text={model.moreNow} paint={paint} rtl={rtl} />
      ) : null}
      {compact ? null : <FlexWidget style={{ flex: 1, width: 'match_parent' }} />}
      {compact ? null : <Secondary text={model.date.hijri} paint={paint} rtl={rtl} fontSize={11} />}
    </Frame>
  )
}
