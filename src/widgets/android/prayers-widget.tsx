'use no memo'

import type { ReactElement } from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'

import type { WidgetModel } from '../model'
import { Caption, Frame, Secondary, ordered, type Paint, type WidgetProps } from './parts'

type Mark = WidgetModel['prayers'][number]

interface MarkProps {
  mark: Mark
  paint: Paint
  diameter: number
  showName: boolean
}

/** Done is a filled accent circle; passed and unmarked is dimmed; upcoming is an outline. */
function PrayerMark({ mark, paint, diameter, showName }: MarkProps): ReactElement {
  const ring = mark.done ? paint.accent : mark.passed ? paint.dimmed : paint.accent
  return (
    <FlexWidget style={{ flex: 1, flexDirection: 'column', alignItems: 'center', flexGap: 4 }}>
      <FlexWidget
        style={{
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          borderWidth: mark.done ? 0 : 1.5,
          borderColor: ring,
          borderStyle: mark.passed && !mark.done ? 'dashed' : 'solid',
          backgroundColor: mark.done ? paint.accent : undefined,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <TextWidget
          text={mark.short}
          style={{
            fontSize: Math.round(diameter * 0.42),
            fontWeight: 'bold',
            color: mark.done ? paint.onAccent : mark.passed ? paint.dimmed : paint.label,
          }}
        />
      </FlexWidget>
      {showName ? (
        <TextWidget
          text={mark.name}
          maxLines={1}
          truncate="END"
          style={{
            fontSize: 11,
            color: mark.passed && !mark.done ? paint.dimmed : paint.secondary,
          }}
        />
      ) : null}
    </FlexWidget>
  )
}

/** Today's five marks. An empty list means tracking is paused, so no marks are drawn. */
export function PrayersWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels } = model
  const compact = layout.size === 'compact'
  const large = layout.size === 'large'
  const diameter = Math.max(
    18,
    Math.min(large ? 48 : 36, Math.floor((layout.width - 28 - 4 * 8) / 5) - 4),
  )
  const showCaption = !(compact && layout.height < 90)
  return (
    <Frame model={model} paint={paint} url={null} label={labels.prayers}>
      {showCaption ? <Caption text={labels.prayers} paint={paint} rtl={rtl} /> : null}
      {model.prayers.length === 0 ? (
        <Secondary text={model.date.gregorian} paint={paint} rtl={rtl} />
      ) : (
        <FlexWidget
          style={{
            width: 'match_parent',
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 8,
          }}>
          {ordered(
            rtl,
            model.prayers.map((mark) => (
              <PrayerMark
                key={mark.name}
                mark={mark}
                paint={paint}
                diameter={diameter}
                showName={!compact}
              />
            )),
          )}
        </FlexWidget>
      )}
      {large ? <Secondary text={model.date.hijri} paint={paint} rtl={rtl} /> : null}
    </Frame>
  )
}
