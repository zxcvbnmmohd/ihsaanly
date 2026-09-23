'use no memo'

import type { ReactElement } from 'react'
import { TextWidget } from 'react-native-android-widget'

import { Caption, Frame, Secondary, type WidgetProps } from './parts'

/** Bundled by the expo-font plugin into assets/fonts, where the library looks it up by name. */
const ARABIC_FONT = 'Amiri-Regular'

/** Today's dua in Arabic, large and centred; its title, and the translation when there is room. */
export function DuaOfTheDayWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels, duaOfTheDay: dua } = model
  if (!dua) {
    return (
      <Frame model={model} paint={paint} url={null} label={labels.duaOfTheDay}>
        <Caption text={labels.duaOfTheDay} paint={paint} rtl={rtl} />
        <Secondary text={labels.nothingNow} paint={paint} rtl={rtl} maxLines={2} />
      </Frame>
    )
  }
  const compact = layout.size === 'compact'
  const large = layout.size === 'large'
  return (
    <Frame model={model} paint={paint} url={dua.url} label={dua.title} center>
      {compact ? null : (
        <TextWidget
          text={dua.title}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 12, fontWeight: 'bold', color: paint.accent, textAlign: 'center' }}
        />
      )}
      <TextWidget
        text={dua.arabic}
        maxLines={compact ? 2 : large ? 6 : 3}
        truncate="END"
        style={{
          width: 'match_parent',
          fontFamily: ARABIC_FONT,
          fontSize: compact ? 18 : large ? 26 : 22,
          color: paint.label,
          textAlign: 'center',
        }}
      />
      {large && dua.translation ? (
        <TextWidget
          text={dua.translation}
          maxLines={4}
          truncate="END"
          style={{
            width: 'match_parent',
            fontSize: 13,
            color: paint.secondary,
            textAlign: 'center',
          }}
        />
      ) : null}
    </Frame>
  )
}
