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

/** The next prayer and a rough distance to it, never a clock time. */
export function NextPrayerWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels, next } = model
  if (!next) {
    return (
      <Frame model={model} paint={paint} url={null} label={labels.upNext}>
        <Caption text={labels.upNext} paint={paint} rtl={rtl} />
        <Secondary text={labels.nothingNow} paint={paint} rtl={rtl} maxLines={2} />
      </Frame>
    )
  }
  const large = layout.size === 'large'
  // Medium shows one of each; large shares what fits between the two lists.
  const budget = large ? rowsFit(layout, ROW_HEIGHT, 56) : 2
  const beforeLimit = Math.min(next.before.length, Math.ceil(budget / 2))
  const afterLimit = Math.max(0, budget - beforeLimit)
  return (
    <Frame model={model} paint={paint} url={null} label={`${next.prayer}, ${next.distance}`}>
      <Caption text={labels.upNext} paint={paint} rtl={rtl} />
      <Headline
        text={next.prayer}
        paint={paint}
        rtl={rtl}
        maxLines={1}
        fontSize={layout.size === 'compact' ? 18 : 24}
      />
      <Secondary text={next.distance} paint={paint} rtl={rtl} />
      {layout.size !== 'compact' ? (
        <LinkList
          links={next.before}
          paint={paint}
          rtl={rtl}
          limit={beforeLimit}
          tag={labels.before}
        />
      ) : null}
      {layout.size !== 'compact' ? (
        <LinkList
          links={next.after}
          paint={paint}
          rtl={rtl}
          limit={afterLimit}
          tag={labels.after}
        />
      ) : null}
    </Frame>
  )
}
