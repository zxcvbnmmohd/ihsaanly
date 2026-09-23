'use no memo'

import type { ReactElement } from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'

import type { WidgetLink } from '../model'
import { Caption, Frame, Secondary, ordered, rowsFit, type Paint, type WidgetProps } from './parts'

const CHIP_HEIGHT = 34

interface ChipProps {
  link: WidgetLink
  paint: Paint
  rtl: boolean
}

/** Each dua is its own tap target, so the widget is a set of doors rather than one. */
function DuaChip({ link, paint, rtl }: ChipProps): ReactElement {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: link.url }}
      accessibilityLabel={link.title}
      style={{
        flex: 1,
        height: CHIP_HEIGHT - 6,
        backgroundColor: paint.surface,
        borderRadius: 12,
        paddingHorizontal: 10,
        justifyContent: 'center',
      }}>
      <TextWidget
        text={link.title}
        maxLines={1}
        truncate="END"
        style={{
          width: 'match_parent',
          fontSize: 13,
          color: paint.label,
          textAlign: rtl ? 'right' : 'left',
        }}
      />
    </FlexWidget>
  )
}

export function QuickDuasWidget({ model, paint, layout }: WidgetProps): ReactElement {
  const { rtl, labels } = model
  const columns = layout.width >= 250 ? 2 : 1
  const rows =
    layout.size === 'compact'
      ? Math.min(2, rowsFit(layout, CHIP_HEIGHT))
      : rowsFit(layout, CHIP_HEIGHT)
  const shown = model.quickDuas.slice(0, rows * columns)
  const grid = Array.from({ length: Math.ceil(shown.length / columns) }, (_, row) =>
    shown.slice(row * columns, row * columns + columns),
  )
  return (
    <Frame model={model} paint={paint} url={null} label={labels.quickDuas}>
      <Caption text={labels.quickDuas} paint={paint} rtl={rtl} />
      {shown.length === 0 ? (
        <Secondary text={labels.nothingNow} paint={paint} rtl={rtl} maxLines={2} />
      ) : null}
      {grid.map((row, index) => (
        <FlexWidget
          key={`row-${index}`}
          style={{ width: 'match_parent', flexDirection: 'row', flexGap: 6 }}>
          {ordered(
            rtl,
            row.map((link) => <DuaChip key={link.url} link={link} paint={paint} rtl={rtl} />),
          )}
          {row.length < columns ? <FlexWidget style={{ flex: 1 }} /> : null}
        </FlexWidget>
      ))}
    </Frame>
  )
}
