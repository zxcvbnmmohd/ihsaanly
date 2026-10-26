'use no memo'

import type { ReactElement } from 'react'

import {
  Caption,
  Frame,
  LinkList,
  MarkButton,
  ROW_HEIGHT,
  rowsFit,
  Secondary,
  standing,
  type WidgetProps,
} from './parts'

/**
 * What the next prayer asks before it and after it. A named prayer's "before"
 * can be marked done ahead, from its row; "after" is not owed yet, so those
 * rows only open the item.
 */
export function UpNextWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels, next } = model
  const caption = next ? `${labels.upNext} · ${next.prayer}` : labels.upNext
  const before = next?.before ?? []
  const after = next?.after ?? []
  const large = layout.size === 'large'
  const budget = layout.size === 'compact' ? 1 : rowsFit(layout, ROW_HEIGHT, large ? 36 : 0)
  const beforeLimit = Math.min(before.length, Math.max(1, Math.ceil(budget / 2)))
  const afterLimit = Math.max(0, budget - Math.min(before.length, beforeLimit))
  return (
    <Frame model={model} paint={paint} url={null} label={caption}>
      <Caption text={caption} paint={paint} rtl={rtl} />
      {before.length === 0 && after.length === 0 ? (
        <Secondary text={labels.nothingNow} paint={paint} rtl={rtl} maxLines={2} />
      ) : null}
      <LinkList
        links={before}
        paint={paint}
        rtl={rtl}
        limit={beforeLimit}
        tag={labels.before}
        markFor={(_, index) => {
          const item = before[index]
          if (!item || item.since === undefined) return null
          return (
            <MarkButton
              paint={paint}
              kind="done"
              id={item.id}
              label={labels.markDone}
              doneLabel={labels.markedDone}
              done={standing(model, item).done}
              compact
            />
          )
        }}
      />
      <LinkList links={after} paint={paint} rtl={rtl} limit={afterLimit} tag={labels.after} />
      {large && next ? <Secondary text={next.distance} paint={paint} rtl={rtl} /> : null}
    </Frame>
  )
}
