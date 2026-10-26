'use no memo'

import type { ReactElement } from 'react'
import { FlexWidget } from 'react-native-android-widget'

import type { WidgetModel } from '../model'
import {
  Caption,
  countLabel,
  Frame,
  Headline,
  type Layout,
  LinkList,
  MarkButton,
  ordered,
  type Paint,
  ROW_HEIGHT,
  rowsFit,
  Secondary,
  standing,
  type WidgetProps,
} from './parts'

/**
 * The mark for the headline item: done, or for a counted item (the tasbih)
 * how far it has got and +1, which completes it at its repeat. A 4x1 strip
 * has no room for one; a 2x2 has room for the check alone.
 */
function markFor(model: WidgetModel, paint: Paint, layout: Layout): ReactElement | null {
  const item = model.rightNow
  if (!item || item.since === undefined) return null
  const compact = layout.size === 'compact'
  if (compact && layout.height < 110) return null
  const { labels, rtl } = model
  const { done, count } = standing(model, item)
  if (item.repeat !== undefined && !done && !compact) {
    return (
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        {ordered(rtl, [
          <Secondary
            key="count"
            text={countLabel(model, count, item.repeat)}
            paint={paint}
            rtl={rtl}
          />,
          <MarkButton
            key="add"
            paint={paint}
            kind="count"
            id={item.id}
            label={labels.addOne}
            doneLabel={labels.markedDone}
            done={false}
          />,
        ])}
      </FlexWidget>
    )
  }
  return (
    <MarkButton
      paint={paint}
      kind="done"
      id={item.id}
      label={labels.markDone}
      doneLabel={labels.markedDone}
      done={done}
      compact={compact}
    />
  )
}

/**
 * The window's headline and the one thing it asks, how long the moment stays
 * open, what else is open, and at the foot the Hijri date with the mark on the
 * far side. The mark is a widget task click; the rest opens the item.
 */
export function RightNowWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels } = model
  const caption = model.window ?? labels.rightNow
  const title = model.rightNow?.title ?? labels.nothingNow
  const compact = layout.size === 'compact'
  const large = layout.size === 'large'
  const action = markFor(model, paint, layout)
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
      <FlexWidget style={{ flex: 1, width: 'match_parent' }} />
      {compact ? (
        action
      ) : (
        <FlexWidget
          style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          {ordered(rtl, [
            <FlexWidget key="date" style={{ flex: 1 }}>
              <Secondary text={model.date.hijri} paint={paint} rtl={rtl} fontSize={11} />
            </FlexWidget>,
            <FlexWidget key="mark">{action}</FlexWidget>,
          ])}
        </FlexWidget>
      )}
    </Frame>
  )
}
