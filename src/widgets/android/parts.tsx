'use no memo'
// The widget tree is walked by calling each component as a plain function, so
// React Compiler's memo cache (a hook) must stay out of every file here.

import type { ReactElement, ReactNode } from 'react'
import { FlexWidget, TextWidget, type HexColor, type WidgetInfo } from 'react-native-android-widget'

import type { WidgetInk, WidgetLink, WidgetModel } from '../model'

export type WidgetSize = 'compact' | 'medium' | 'large'

export interface Layout {
  size: WidgetSize
  width: number
  height: number
}

/** Hex colours narrowed to the library's type, with a dimmed label for passed prayers. */
export interface Paint {
  from: HexColor
  to: HexColor
  surface: HexColor
  accent: HexColor
  onAccent: HexColor
  label: HexColor
  secondary: HexColor
  dimmed: HexColor
}

/** What every widget component receives: one entry, one scheme, one size. */
export interface WidgetProps {
  model: WidgetModel
  paint: Paint
  layout: Layout
}

const PADDING = 14
const CAPTION_HEIGHT = 20

function isHex(value: string): value is HexColor {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function hex(value: string, fallback: HexColor): HexColor {
  return isHex(value) ? value : fallback
}

export function paintFor(ink: WidgetInk): Paint {
  const secondary = hex(ink.secondaryLabel, '#777777')
  return {
    from: hex(ink.background, '#ffffff'),
    to: hex(ink.backgroundEnd, hex(ink.background, '#ffffff')),
    surface: hex(ink.surface, '#ffffff'),
    accent: hex(ink.accent, '#a94a32'),
    onAccent: hex(ink.onAccent, '#ffffff'),
    label: hex(ink.label, '#000000'),
    secondary,
    // #RRGGBBAA; the library converts it to Android's #AARRGGBB.
    dimmed: `${secondary}66`,
  }
}

/**
 * Launcher cells differ by device, so sizes are read from dp rather than
 * cells: under ~180dp wide or ~110dp tall is a 2x1/2x2 or a 4x1 strip, and
 * ~220dp tall is a 4x4 or larger.
 */
export function layoutFor(info: WidgetInfo): Layout {
  const { width, height } = info
  const size: WidgetSize =
    width < 180 || height < 110 ? 'compact' : height >= 220 ? 'large' : 'medium'
  return { size, width, height }
}

/** How many rows of `rowHeight` fit under the caption and anything else reserved. */
export function rowsFit(layout: Layout, rowHeight: number, reserved = 0): number {
  const room = layout.height - PADDING * 2 - CAPTION_HEIGHT - reserved
  return Math.max(1, Math.floor(room / rowHeight))
}

/** The library has no row-reverse or logical alignment, so RTL reverses by hand. */
export function ordered<T>(rtl: boolean, children: T[]): T[] {
  return rtl ? [...children].reverse() : children
}

function textAlign(rtl: boolean): 'left' | 'right' {
  return rtl ? 'right' : 'left'
}

interface FrameProps {
  model: WidgetModel
  paint: Paint
  /** A deep link for the whole widget; null opens the app. */
  url: string | null
  label: string
  center?: boolean
  children?: ReactNode
}

export function Frame({ model, paint, url, label, center, children }: FrameProps): ReactElement {
  return (
    <FlexWidget
      clickAction={url ? 'OPEN_URI' : 'OPEN_APP'}
      clickActionData={url ? { uri: url } : undefined}
      accessibilityLabel={label}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: center ? 'center' : 'flex-start',
        alignItems: center ? 'center' : model.rtl ? 'flex-end' : 'flex-start',
        backgroundGradient: { from: paint.from, to: paint.to, orientation: 'TL_BR' },
        borderRadius: 22,
        padding: PADDING,
        flexGap: 4,
      }}>
      {children}
    </FlexWidget>
  )
}

interface StaleProps {
  model: WidgetModel
  paint: Paint
}

/** Past the end of the timeline the widget asks for the app and says nothing else. */
export function Stale({ model, paint }: StaleProps): ReactElement {
  return (
    <Frame model={model} paint={paint} url={null} label={model.labels.openApp} center>
      <TextWidget
        text={model.labels.openApp}
        maxLines={3}
        truncate="END"
        style={{ fontSize: 14, color: paint.label, textAlign: 'center' }}
      />
    </Frame>
  )
}

interface TextProps {
  text: string
  paint: Paint
  rtl: boolean
  maxLines?: number
  fontSize?: number
}

export function Caption({ text, paint, rtl }: TextProps): ReactElement {
  return (
    <TextWidget
      text={text}
      maxLines={1}
      truncate="END"
      style={{
        width: 'match_parent',
        fontSize: 12,
        fontWeight: 'bold',
        color: paint.accent,
        textAlign: textAlign(rtl),
      }}
    />
  )
}

export function Headline({
  text,
  paint,
  rtl,
  maxLines = 2,
  fontSize = 17,
}: TextProps): ReactElement {
  return (
    <TextWidget
      text={text}
      maxLines={maxLines}
      truncate="END"
      style={{
        width: 'match_parent',
        fontSize,
        fontWeight: 'bold',
        color: paint.label,
        textAlign: textAlign(rtl),
      }}
    />
  )
}

export function Secondary({
  text,
  paint,
  rtl,
  maxLines = 1,
  fontSize = 12,
}: TextProps): ReactElement {
  return (
    <TextWidget
      text={text}
      maxLines={maxLines}
      truncate="END"
      style={{ width: 'match_parent', fontSize, color: paint.secondary, textAlign: textAlign(rtl) }}
    />
  )
}

export const ROW_HEIGHT = 24
export const DETAIL_ROW_HEIGHT = 38

interface LinkRowProps {
  link: WidgetLink
  paint: Paint
  rtl: boolean
  showDetail?: boolean
  /** A short tag in the accent before the title, such as "Before". */
  tag?: string
}

/** One item, its own tap target: a dot, the title, and its detail when asked for. */
export function LinkRow({ link, paint, rtl, showDetail, tag }: LinkRowProps): ReactElement {
  const title = (
    <FlexWidget key="title" style={{ flex: 1, flexDirection: 'column' }}>
      <TextWidget
        text={tag ? `${tag} · ${link.title}` : link.title}
        maxLines={1}
        truncate="END"
        style={{
          width: 'match_parent',
          fontSize: 13,
          color: paint.label,
          textAlign: textAlign(rtl),
        }}
      />
      {showDetail && link.detail ? (
        <TextWidget
          text={link.detail}
          maxLines={1}
          truncate="END"
          style={{
            width: 'match_parent',
            fontSize: 11,
            color: paint.secondary,
            textAlign: textAlign(rtl),
          }}
        />
      ) : null}
    </FlexWidget>
  )
  const dot = (
    <FlexWidget
      key="dot"
      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: paint.accent }}
    />
  )
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: link.url }}
      accessibilityLabel={link.title}
      style={{
        width: 'match_parent',
        height: showDetail && link.detail ? DETAIL_ROW_HEIGHT : ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: 8,
      }}>
      {ordered(rtl, [dot, title])}
    </FlexWidget>
  )
}

interface LinkListProps {
  links: WidgetLink[]
  paint: Paint
  rtl: boolean
  limit: number
  showDetail?: boolean
  tag?: string
}

export function LinkList({
  links,
  paint,
  rtl,
  limit,
  showDetail,
  tag,
}: LinkListProps): ReactElement {
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
      {links.slice(0, Math.max(0, limit)).map((link) => (
        <LinkRow
          key={link.url}
          link={link}
          paint={paint}
          rtl={rtl}
          showDetail={showDetail}
          tag={tag}
        />
      ))}
    </FlexWidget>
  )
}
