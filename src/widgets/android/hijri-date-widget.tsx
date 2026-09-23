'use no memo'

import type { ReactElement } from 'react'

import { Caption, Frame, Headline, Secondary, type WidgetProps } from './parts'

/** The Hijri date large, the Gregorian date and the place beneath it. */
export function HijriDateWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels, date } = model
  const compact = layout.size === 'compact'
  const large = layout.size === 'large'
  const secondary = [date.gregorian, date.place].filter((part) => part !== null).join(' · ')
  return (
    <Frame model={model} paint={paint} url="ihsaanly://hijri" label={date.hijri}>
      {compact ? null : <Caption text={labels.hijri} paint={paint} rtl={rtl} />}
      <Headline
        text={date.hijri}
        paint={paint}
        rtl={rtl}
        fontSize={compact ? 16 : large ? 28 : 22}
        maxLines={2}
      />
      {large ? (
        <Secondary text={date.gregorian} paint={paint} rtl={rtl} fontSize={14} />
      ) : (
        <Secondary text={compact ? date.gregorian : secondary} paint={paint} rtl={rtl} />
      )}
      {large && date.place ? (
        <Secondary text={date.place} paint={paint} rtl={rtl} fontSize={14} />
      ) : null}
      {large && model.window ? <Caption text={model.window} paint={paint} rtl={rtl} /> : null}
    </Frame>
  )
}
