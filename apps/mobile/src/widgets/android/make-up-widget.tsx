'use no memo'

import type { ReactElement } from 'react'

import { Caption, Frame, Headline, Secondary, type WidgetProps } from './parts'

/**
 * What is owed, as the app words it. The summary is already counted in the
 * reader's language, so it is split into its parts rather than rebuilt from
 * bare numbers, which Arabic cannot place next to a noun.
 */
export function MakeUpWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels, makeUp } = model
  const owed = makeUp.prayers + makeUp.fasts > 0 && makeUp.summary !== null
  const parts = makeUp.summary?.split(' · ') ?? []
  const compact = layout.size === 'compact'
  return (
    <Frame model={model} paint={paint} url={makeUp.url} label={labels.makeUp}>
      <Caption text={labels.makeUp} paint={paint} rtl={rtl} />
      {!owed ? (
        <Headline text={labels.nothingOwed} paint={paint} rtl={rtl} fontSize={compact ? 15 : 19} />
      ) : compact ? (
        <Headline text={makeUp.summary ?? ''} paint={paint} rtl={rtl} fontSize={15} maxLines={2} />
      ) : (
        parts.map((part) => (
          <Headline
            key={part}
            text={part}
            paint={paint}
            rtl={rtl}
            maxLines={1}
            fontSize={layout.size === 'large' ? 22 : 18}
          />
        ))
      )}
      {layout.size === 'large' ? (
        <Secondary text={model.date.hijri} paint={paint} rtl={rtl} />
      ) : null}
    </Frame>
  )
}
