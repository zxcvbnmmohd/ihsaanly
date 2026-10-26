import type { ReactElement } from 'react'
import { Text, View } from 'react-native'

import { useUi } from '../provider'
import {
  APP_NAME,
  type HomeFamily,
  LOCK_INK,
  type LockFamily,
  LockFrame,
  type PreviewInk,
  type PreviewPlatform,
  WIDGET_POINTS,
  WidgetFrame,
  type WidgetLook,
  WidgetScene,
  WidgetText,
  type WidgetTextSize,
  type WidgetTone,
  type WidgetWeight,
} from './widget-scene'

export type { HomeFamily, LockFamily, PreviewInk, PreviewPlatform }

/** The ten widgets, in the order the gallery lists them (the app's `WIDGET_NAMES`). */
export const GALLERY_WIDGETS = [
  'rightNow',
  'nextPrayer',
  'prayers',
  'hijriDate',
  'upNext',
  'alsoToday',
  'quickDuas',
  'duaOfTheDay',
  'makeUp',
  'comingUp',
] as const
export type GalleryWidget = (typeof GALLERY_WIDGETS)[number]

export const HOME_FAMILIES = ['small', 'medium', 'large'] as const satisfies HomeFamily[]

/** iOS's accessory families. Android has no Lock Screen widgets. */
export const LOCK_FAMILIES = ['circular', 'rectangular', 'inline'] as const satisfies LockFamily[]

export type PreviewFamily = HomeFamily | LockFamily

/**
 * The Lock Screen families each widget declares on iOS (`supportedFamilies`
 * in the app's `app.json`, which a test in the app holds this to). Today every
 * widget declares all three.
 */
export const LOCK_FAMILIES_BY_WIDGET: Record<GalleryWidget, readonly LockFamily[]> = {
  rightNow: LOCK_FAMILIES,
  nextPrayer: LOCK_FAMILIES,
  prayers: LOCK_FAMILIES,
  hijriDate: LOCK_FAMILIES,
  upNext: LOCK_FAMILIES,
  alsoToday: LOCK_FAMILIES,
  quickDuas: LOCK_FAMILIES,
  duaOfTheDay: LOCK_FAMILIES,
  makeUp: LOCK_FAMILIES,
  comingUp: LOCK_FAMILIES,
}

export interface PreviewLink {
  title: string
  detail: string | null
  url: string
}

/** A row a widget can mark: with `since` it carries a button, without it only opens. */
export interface PreviewItem extends PreviewLink {
  since?: number
  done?: boolean
  repeat?: number
  count?: number
}

/**
 * What a widget shows at one moment: the part of the app's `WidgetModel`
 * (one entry of `widgetTimeline`) the previews draw. Structural, so the app's
 * model passes as it is.
 */
export interface WidgetPreviewModel {
  ink: { light: PreviewInk; dark: PreviewInk }
  labels: {
    rightNow: string
    upNext: string
    prayers: string
    hijri: string
    alsoToday: string
    quickDuas: string
    duaOfTheDay: string
    makeUp: string
    comingUp: string
    nothingNow: string
    nothingOwed: string
    before: string
    after: string
    markDone: string
    markedDone: string
    saidIt: string
    marked: string
    addOne: string
    countOf: string
  }
  window: string | null
  remaining: string | null
  date: { gregorian: string; hijri: string; hijriDay: number; place: string | null }
  rightNow: PreviewItem | null
  alsoNow: PreviewLink[]
  moreNow: string | null
  next: { prayer: string; distance: string; before: PreviewItem[]; after: PreviewLink[] } | null
  prayers: { id: string; name: string; done: boolean; passed: boolean; since?: number }[]
  allDay: PreviewLink[]
  comingUp: PreviewLink[]
  quickDuas: PreviewItem[]
  duaOfTheDay: { title: string; arabic: string; translation: string | null; done: boolean } | null
  makeUp: { prayers: number; fasts: number; summary: string | null }
}

type Tone = WidgetTone
type Size = WidgetTextSize

interface Kit {
  say: (
    text: string,
    size: Size,
    tone?: Tone,
    lines?: number,
    weight?: WidgetWeight,
  ) => ReactElement
  heading: (text: string) => ReactElement
  row: (item: PreviewLink, mark?: ReactElement | null) => ReactElement
  /** A widget button, drawn but inert; compact is the round icon-only one. */
  button: (label: string, compact?: boolean, icon?: string | null) => ReactElement
  /** The button a markable row carries, or its tick once marked. */
  mark: (item: PreviewItem, label: string) => ReactElement | null
  /** A filled check, as `checkmark.circle.fill` is drawn once something is marked. */
  check: (size: number) => ReactElement
  /** Points on the phone, at the preview's scale. */
  pt: (points: number) => number
  spacer: ReactElement
}

function kitFor(look: WidgetLook): Kit {
  const pt = (points: number): number => points * look.scale
  const say = (
    text: string,
    size: Size,
    tone: Tone = 'label',
    lines = 1,
    weight?: WidgetWeight,
  ): ReactElement => (
    <WidgetText look={look} text={text} size={size} tone={tone} lines={lines} weight={weight} />
  )
  const check = (size: number): ReactElement => (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: pt(size), height: pt(size), backgroundColor: look.ink.accent }}>
      <Text style={{ color: look.ink.onAccent, fontSize: pt(size * 0.6), fontWeight: '700' }}>
        ✓
      </Text>
    </View>
  )
  // iOS: a small, bordered-prominent capsule (or circle) tinted with the accent.
  // Android: the app's MarkButton, bold accent text with no fill.
  const button = (text: string, compact = false, icon: string | null = '✓'): ReactElement => {
    if (look.platform === 'android') {
      return (
        <View aria-label={text} className="flex-row items-center" style={{ gap: pt(4) }}>
          {icon ? say(icon, 'caption', 'accent', 1, 'bold') : null}
          {compact ? null : say(text, 'caption', 'accent', 1, 'bold')}
        </View>
      )
    }
    return (
      <View
        aria-label={text}
        className="flex-row items-center justify-center rounded-full"
        style={[
          { backgroundColor: look.ink.accent, gap: pt(4) },
          compact
            ? { width: pt(28), height: pt(28) }
            : { height: pt(28), paddingHorizontal: pt(10), alignSelf: 'flex-start' },
        ]}>
        {icon ? (
          <Text style={{ color: look.ink.onAccent, fontSize: pt(13), fontWeight: '700' }}>
            {icon}
          </Text>
        ) : null}
        {compact ? null : (
          <Text style={{ color: look.ink.onAccent, fontSize: pt(13), fontWeight: '600' }}>
            {text}
          </Text>
        )}
      </View>
    )
  }
  return {
    say,
    heading: (text) => say(text, 'caption', 'accent', 1, 'semibold'),
    row: (item, mark = null) => (
      <View key={item.url} className="flex-row items-center" style={{ gap: pt(8) }}>
        <View className="flex-1">
          {say(item.title, 'subheadline', 'label', 1, 'medium')}
          {item.detail ? say(item.detail, 'caption', 'secondary') : null}
        </View>
        {mark}
      </View>
    ),
    button,
    mark: (item, label) => {
      if (item.since === undefined) return null
      if (item.done) return check(22)
      // A row's mark is the round, icon-only button, as on iOS.
      return button(label, true)
    },
    check,
    pt,
    spacer: <View className="flex-1" />,
  }
}

interface Body {
  kit: Kit
  model: WidgetPreviewModel
  family: PreviewFamily
  look: WidgetLook
}

/** A widget with nothing to show says so, in each family's own shape. */
function nothing({ kit, model, family }: Body, heading: string, glyph = '✓'): ReactElement {
  if (family === 'inline') return kit.say(model.labels.nothingNow, 'footnote')
  if (family === 'circular') return kit.say(glyph, 'title2', 'label', 1, 'bold')
  if (family === 'rectangular') return kit.say(model.labels.nothingNow, 'footnote', 'label', 3)
  return (
    <>
      {kit.heading(heading)}
      {kit.say(model.labels.nothingNow, 'headline', 'label', 4)}
    </>
  )
}

function rightNow({ kit, model, family }: Body): ReactElement {
  const item = model.rightNow
  const labels = model.labels
  const title = item?.title ?? labels.nothingNow
  const caption = model.window ?? labels.rightNow
  if (family === 'inline') return kit.say(title, 'footnote')
  if (family === 'circular') {
    return kit.say(item ? `${1 + model.alsoNow.length}` : '✓', 'title2', 'label', 1, 'bold')
  }
  if (family === 'rectangular') {
    return (
      <>
        {kit.say(caption, 'caption', 'secondary', 1, 'semibold')}
        {kit.say(title, 'headline', 'label', 2)}
      </>
    )
  }

  const repeat = item?.repeat ?? 0
  const count = Math.min(repeat, item?.count ?? 0)
  const done = item?.done === true || (repeat > 0 && count >= repeat)
  const action = (compact: boolean): ReactElement | null => {
    if (!item) return null
    if (done) {
      return (
        <View className="flex-row items-center" style={{ gap: kit.pt(4) }}>
          {kit.check(compact ? 22 : 15)}
          {compact ? null : kit.say(labels.markedDone, 'caption', 'secondary', 1, 'semibold')}
        </View>
      )
    }
    if (repeat > 0 && !compact) {
      return (
        <View className="flex-row items-center" style={{ gap: kit.pt(6) }}>
          {kit.say(
            labels.countOf.replace('{count}', `${count}`).replace('{total}', `${repeat}`),
            'caption',
            'secondary',
            1,
            'semibold',
          )}
          {kit.button(labels.addOne, false, '+')}
        </View>
      )
    }
    return kit.button(labels.markDone, compact)
  }
  const footer = (compact: boolean): ReactElement => (
    <View className="flex-row items-center" style={{ gap: kit.pt(6) }}>
      <View className="flex-1">
        {kit.say(model.date.hijri, 'caption2', 'secondary', compact ? 2 : 1)}
      </View>
      {action(compact)}
    </View>
  )
  const left = item ? model.remaining : null
  const remaining = left ? kit.say(left, 'caption', 'secondary') : null
  const more = model.moreNow ? kit.say(model.moreNow, 'caption', 'accent', 1, 'medium') : null

  if (family === 'small') {
    return (
      <>
        {kit.heading(caption)}
        {kit.say(title, 'headline', 'label', 3)}
        {remaining}
        {kit.spacer}
        {more}
        {footer(true)}
      </>
    )
  }
  if (family === 'medium') {
    const [only] = model.alsoNow
    return (
      <>
        {kit.heading(left ? `${caption} · ${left}` : caption)}
        {kit.say(title, 'headline', 'label', 2)}
        {model.alsoNow.length === 1 && only ? kit.row(only) : more}
        {kit.spacer}
        {footer(false)}
      </>
    )
  }
  const next = model.next
  return (
    <>
      {kit.heading(labels.rightNow)}
      {model.window ? kit.say(model.window, 'subheadline', 'secondary') : null}
      {kit.say(title, 'title2', 'label', 3, 'semibold')}
      {remaining}
      {model.alsoNow.slice(0, 5).map((entry) => kit.row(entry))}
      {next ? kit.heading(labels.upNext) : null}
      {next ? kit.say(`${next.prayer} · ${next.distance}`, 'subheadline') : null}
      {kit.spacer}
      {footer(false)}
    </>
  )
}

function nextPrayer(body: Body): ReactElement {
  const { kit, model, family } = body
  const next = model.next
  const labels = model.labels
  if (!next) return nothing(body, labels.upNext, '☾')
  if (family === 'inline') return kit.say(`${next.prayer} · ${next.distance}`, 'footnote')
  if (family === 'circular') return kit.say(next.prayer, 'caption', 'label', 1, 'semibold')
  if (family === 'rectangular') {
    const first = next.before[0] ?? next.after[0]
    return (
      <>
        {kit.say(next.prayer, 'headline')}
        {kit.say(next.distance, 'caption', 'secondary')}
        {first ? kit.say(first.title, 'caption', 'secondary') : null}
      </>
    )
  }
  if (family === 'small') {
    return (
      <>
        {kit.heading(labels.upNext)}
        {kit.say(next.prayer, 'title')}
        {kit.say(next.distance, 'subheadline', 'secondary', 2)}
      </>
    )
  }
  if (family === 'medium') {
    const before = next.before[0]
    const after = next.after[0]
    return (
      <>
        {kit.heading(labels.upNext)}
        {kit.say(`${next.prayer} · ${next.distance}`, 'headline')}
        {before ? kit.say(`${labels.before}: ${before.title}`, 'subheadline') : null}
        {after ? kit.say(`${labels.after}: ${after.title}`, 'subheadline') : null}
      </>
    )
  }
  return (
    <>
      {kit.heading(labels.upNext)}
      {kit.say(next.prayer, 'largeTitle')}
      {kit.say(next.distance, 'title3', 'secondary', 1, 'regular')}
      {next.before.length > 0 ? kit.heading(labels.before) : null}
      {next.before.slice(0, 4).map((entry) => kit.row(entry))}
      {next.after.length > 0 ? kit.heading(labels.after) : null}
      {next.after.slice(0, 4).map((entry) => kit.row(entry))}
    </>
  )
}

function prayers(body: Body): ReactElement {
  const { kit, model, family, look } = body
  const ink = look.ink
  const all = model.prayers
  const labels = model.labels
  if (all.length === 0) return nothing(body, labels.prayers, '‖')
  const count = `${all.filter((prayer) => prayer.done).length}/${all.length}`
  const dot = (prayer: (typeof all)[number], size: number): ReactElement => (
    <View
      key={prayer.id}
      className="rounded-full"
      style={
        prayer.done
          ? { width: kit.pt(size), height: kit.pt(size), backgroundColor: ink.accent }
          : {
              width: kit.pt(size),
              height: kit.pt(size),
              borderWidth: 1.5,
              borderColor: prayer.passed ? ink.secondaryLabel : ink.label,
              borderStyle: prayer.passed ? 'dashed' : 'solid',
              opacity: prayer.passed ? 0.5 : 1,
            }
      }
    />
  )
  const dots = (size: number): ReactElement => (
    <View className="flex-row" style={{ gap: kit.pt(size / 2) }}>
      {all.map((prayer) => dot(prayer, size))}
    </View>
  )
  const tone = (prayer: (typeof all)[number]): Tone =>
    prayer.passed && !prayer.done ? 'secondary' : 'label'

  if (family === 'inline') return kit.say(`${labels.prayers} ${count}`, 'footnote')
  if (family === 'circular') return kit.say(count, 'headline', 'label', 1, 'bold')
  if (family === 'rectangular') {
    return (
      <>
        {kit.say(`${labels.prayers} ${count}`, 'headline')}
        {dots(12)}
      </>
    )
  }
  if (family === 'small') {
    return (
      <>
        {kit.heading(labels.prayers)}
        {kit.say(count, 'largeTitle')}
        {kit.spacer}
        {dots(14)}
      </>
    )
  }
  if (family === 'medium') {
    return (
      <>
        {kit.heading(`${labels.prayers} · ${count}`)}
        {kit.spacer}
        <View className="flex-row justify-between">
          {all.map((prayer) => (
            <View key={prayer.id} className="items-center" style={{ gap: kit.pt(4) }}>
              {dot(prayer, 28)}
              {kit.say(prayer.name, 'caption', tone(prayer))}
            </View>
          ))}
        </View>
        {kit.spacer}
      </>
    )
  }
  return (
    <>
      {kit.heading(labels.prayers)}
      {kit.say(count, 'largeTitle')}
      {all.map((prayer) => (
        <View key={prayer.id} className="flex-row items-center" style={{ gap: kit.pt(12) }}>
          {dot(prayer, 24)}
          {kit.say(prayer.name, 'title3', tone(prayer), 1, 'regular')}
        </View>
      ))}
    </>
  )
}

function hijriDate({ kit, model, family }: Body): ReactElement {
  const date = model.date
  const detail = date.place ? `${date.gregorian} · ${date.place}` : date.gregorian
  if (family === 'inline') return kit.say(date.hijri, 'footnote')
  if (family === 'circular') return kit.say(String(date.hijriDay), 'title3', 'label', 1, 'bold')
  if (family === 'rectangular') {
    return (
      <>
        {kit.say(date.hijri, 'headline', 'label', 2)}
        {kit.say(detail, 'caption', 'secondary')}
      </>
    )
  }
  if (family === 'small') {
    return (
      <>
        {kit.heading(model.labels.hijri)}
        {kit.spacer}
        {kit.say(date.hijri, 'title3', 'label', 3)}
        {kit.say(date.gregorian, 'footnote', 'secondary')}
      </>
    )
  }
  if (family === 'medium') {
    return (
      <>
        {kit.heading(model.labels.hijri)}
        {kit.spacer}
        {kit.say(date.hijri, 'title', 'label', 2)}
        {kit.say(detail, 'subheadline', 'secondary')}
      </>
    )
  }
  return (
    <>
      {kit.heading(model.labels.hijri)}
      {kit.spacer}
      {kit.say(date.hijri, 'largeTitle', 'label', 3)}
      {kit.say(date.gregorian, 'title3', 'secondary', 1, 'regular')}
      {date.place ? kit.say(date.place, 'subheadline', 'secondary') : null}
      {kit.spacer}
    </>
  )
}

function upNext(body: Body): ReactElement {
  const { kit, model, family } = body
  const next = model.next
  const labels = model.labels
  const asked = next ? [...next.before, ...next.after] : []
  const [first] = asked
  if (!next || !first) {
    return nothing(body, next ? `${labels.upNext} · ${next.prayer}` : labels.upNext)
  }
  if (family === 'inline') return kit.say(`${next.prayer}: ${first.title}`, 'footnote')
  if (family === 'circular') {
    return (
      <>
        {kit.say(`${asked.length}`, 'title3', 'label', 1, 'bold')}
        {kit.say(next.prayer, 'caption', 'secondary')}
      </>
    )
  }
  const before = next.before[0]
  const after = next.after[0]
  if (family === 'rectangular') {
    return (
      <>
        {kit.say(next.prayer, 'headline')}
        {before ? kit.say(`${labels.before}: ${before.title}`, 'caption', 'secondary') : null}
        {after ? kit.say(`${labels.after}: ${after.title}`, 'caption', 'secondary') : null}
      </>
    )
  }
  const heading = kit.heading(`${labels.upNext} · ${next.prayer}`)
  if (family === 'small') {
    return (
      <>
        {heading}
        {kit.say(first.title, 'headline', 'label', 3)}
        {asked.length > 1 ? kit.say(`+${asked.length - 1}`, 'caption', 'secondary') : null}
      </>
    )
  }
  const medium = family === 'medium'
  return (
    <>
      {heading}
      {medium ? null : kit.say(next.distance, 'subheadline', 'secondary')}
      {before ? kit.say(labels.before, 'caption', 'secondary') : null}
      {next.before
        .slice(0, medium ? 1 : 4)
        .map((entry) => kit.row(entry, kit.mark(entry, labels.markDone)))}
      {after ? kit.say(labels.after, 'caption', 'secondary') : null}
      {next.after.slice(0, medium ? 2 : 4).map((entry) => kit.row(entry))}
    </>
  )
}

function list(
  body: Body,
  entries: PreviewLink[],
  heading: string,
  limits: { medium: number; large: number },
  label: (entry: PreviewLink) => string = (entry) => entry.title,
): ReactElement {
  const { kit, family } = body
  const [first] = entries
  if (!first) return nothing(body, heading)
  if (family === 'inline') return kit.say(label(first), 'footnote')
  if (family === 'circular') return kit.say(`${entries.length}`, 'title2', 'label', 1, 'bold')
  if (family === 'rectangular') {
    return (
      <>
        {kit.say(heading, 'caption', 'secondary')}
        {entries.slice(0, 2).map((entry) => (
          <View key={entry.url}>{kit.say(label(entry), 'headline')}</View>
        ))}
      </>
    )
  }
  if (family === 'small') {
    return (
      <>
        {kit.heading(heading)}
        {kit.say(first.title, 'headline', 'label', 3)}
        {first.detail ? kit.say(first.detail, 'caption', 'secondary') : null}
        {entries.length > 1 ? kit.say(`+${entries.length - 1}`, 'caption', 'secondary') : null}
      </>
    )
  }
  return (
    <>
      {kit.heading(heading)}
      {entries.slice(0, limits[family]).map((entry) => kit.row(entry))}
    </>
  )
}

function quickDuas({ kit, model, family }: Body): ReactElement {
  const duas = model.quickDuas
  const labels = model.labels
  if (family === 'inline') return kit.say(labels.quickDuas, 'footnote')
  if (family === 'circular') return kit.say(`${duas.length}`, 'title2', 'label', 1, 'bold')
  if (family === 'rectangular') {
    return (
      <>
        {kit.say(labels.quickDuas, 'caption', 'secondary')}
        {duas.slice(0, 2).map((entry) => (
          <View key={entry.url}>{kit.say(entry.title, 'headline')}</View>
        ))}
      </>
    )
  }
  // Small is one tap target, so its rows carry no buttons.
  if (family === 'small') {
    return (
      <>
        {kit.heading(labels.quickDuas)}
        {duas.slice(0, 3).map((entry) => kit.row(entry))}
      </>
    )
  }
  const marked = (entry: PreviewItem): ReactElement =>
    kit.row(entry, kit.mark(entry, labels.markDone))
  if (family === 'medium') {
    return (
      <>
        {kit.heading(labels.quickDuas)}
        <View className="flex-row" style={{ gap: kit.pt(12) }}>
          <View className="flex-1" style={{ gap: kit.pt(4) }}>
            {duas.slice(0, 2).map(marked)}
          </View>
          <View className="flex-1" style={{ gap: kit.pt(4) }}>
            {duas.slice(2, 4).map(marked)}
          </View>
        </View>
      </>
    )
  }
  return (
    <>
      {kit.heading(labels.quickDuas)}
      {duas.slice(0, 8).map(marked)}
    </>
  )
}

function duaOfTheDay(body: Body): ReactElement {
  const { kit, model, family, look } = body
  const dua = model.duaOfTheDay
  const labels = model.labels
  if (!dua) return nothing(body, labels.duaOfTheDay, '۞')
  // Arabic reads right to left and sits centred, whatever the app's language.
  const words = (size: Size, lines: number): ReactElement => (
    <WidgetText look={look} text={dua.arabic} size={size} lines={lines} weight="regular" arabic />
  )
  const saidIt = dua.done ? (
    <View className="flex-row items-center" style={{ gap: kit.pt(4) }}>
      {kit.check(15)}
      {kit.say(labels.marked, 'caption', 'secondary', 1, 'semibold')}
    </View>
  ) : (
    kit.button(labels.saidIt)
  )
  if (family === 'inline') return kit.say(dua.title, 'footnote')
  if (family === 'circular') return kit.say(dua.title, 'caption', 'label', 3)
  if (family === 'rectangular') {
    return (
      <>
        {words('headline', 2)}
        {kit.say(dua.title, 'caption', 'secondary')}
      </>
    )
  }
  if (family === 'small') {
    return (
      <>
        {kit.heading(labels.duaOfTheDay)}
        {kit.spacer}
        {words('title2', 3)}
        {kit.spacer}
        {kit.say(dua.title, 'caption', 'secondary')}
      </>
    )
  }
  if (family === 'medium') {
    return (
      <>
        {kit.heading(labels.duaOfTheDay)}
        {kit.spacer}
        {words('title', 2)}
        {kit.spacer}
        {kit.say(dua.title, 'subheadline')}
        {saidIt}
      </>
    )
  }
  return (
    <>
      {kit.heading(labels.duaOfTheDay)}
      {kit.spacer}
      {words('largeTitle', 4)}
      {kit.spacer}
      {kit.say(dua.title, 'headline')}
      {dua.translation ? kit.say(dua.translation, 'body', 'secondary', 4) : null}
      {saidIt}
    </>
  )
}

function makeUp({ kit, model, family }: Body): ReactElement {
  const owed = model.makeUp
  const total = owed.prayers + owed.fasts
  const summary = total > 0 ? (owed.summary ?? `${total}`) : model.labels.nothingOwed
  const parts = total > 0 && owed.summary ? owed.summary.split(' · ') : [summary]
  const each = (size: Size): ReactElement[] =>
    parts.map((part) => <View key={part}>{kit.say(part, size)}</View>)
  if (family === 'inline') return kit.say(summary, 'footnote')
  if (family === 'circular') {
    return kit.say(total > 0 ? `${total}` : '✓', 'title2', 'label', 1, 'bold')
  }
  if (family === 'rectangular') {
    return (
      <>
        {kit.say(model.labels.makeUp, 'caption', 'secondary')}
        {each('headline').slice(0, 2)}
      </>
    )
  }
  if (family === 'small') {
    return (
      <>
        {kit.heading(model.labels.makeUp)}
        {total > 0 ? kit.say(`${total}`, 'largeTitle') : null}
        {kit.say(
          summary,
          total > 0 ? 'footnote' : 'headline',
          total > 0 ? 'secondary' : 'label',
          3,
        )}
      </>
    )
  }
  return (
    <>
      {kit.heading(model.labels.makeUp)}
      {kit.spacer}
      {each(family === 'medium' ? 'title3' : 'title2')}
      {kit.spacer}
    </>
  )
}

const BODIES: Record<GalleryWidget, (body: Body) => ReactElement> = {
  rightNow,
  nextPrayer,
  prayers,
  hijriDate,
  upNext,
  alsoToday: (body) =>
    list(body, body.model.allDay, body.model.labels.alsoToday, { medium: 3, large: 7 }),
  quickDuas,
  duaOfTheDay,
  makeUp,
  comingUp: (body) =>
    list(body, body.model.comingUp, body.model.labels.comingUp, { medium: 2, large: 5 }, (entry) =>
      entry.detail ? `${entry.title} · ${entry.detail}` : entry.title,
    ),
}

export interface WidgetPreviewProps {
  widget: GalleryWidget
  family: PreviewFamily
  model: WidgetPreviewModel
  /** What a screen reader hears for the whole preview: "Prayers widget preview". */
  label: string
  /** iOS draws SwiftUI's type, its continuous corner and the app's name; Android its own. */
  platform?: PreviewPlatform
}

function isLock(family: PreviewFamily): family is LockFamily {
  return (LOCK_FAMILIES as readonly string[]).includes(family)
}

/** The width a family needs at full size: the scene scales to fit it, and medium and large share it. */
function fitFor(family: PreviewFamily): number {
  if (family === 'inline') return WIDGET_POINTS.rectangular.width * 1.5
  return WIDGET_POINTS[family === 'small' ? 'medium' : family].width
}

/**
 * One widget in one family, drawn in React Native from the same timeline entry
 * the real widget renders, on a wallpaper as it will be seen: SwiftUI's type
 * sizes, spacing and continuous corner, at the iPhone's own proportions and
 * scaled together to fit, with the app's name under it; Android's own type and
 * corner. Lock Screen widgets are one vibrant white under the date and the
 * clock, as iOS tints them, with the inline one on the date line.
 */
export function WidgetPreview({
  widget,
  family,
  model,
  label,
  platform = 'ios',
}: WidgetPreviewProps): ReactElement {
  const { scheme } = useUi()
  const ink = model.ink[scheme]
  const draw = (scale: number): ReactElement => {
    const lock = isLock(family)
    const look: WidgetLook = {
      ink: lock ? LOCK_INK : ink,
      platform,
      lock,
      scale,
      dateLine: family === 'inline',
    }
    const content = BODIES[widget]({ kit: kitFor(look), model, family, look })
    return isLock(family) ? (
      <LockFrame look={look} family={family}>
        {content}
      </LockFrame>
    ) : (
      <WidgetFrame look={look} family={family}>
        {content}
      </WidgetFrame>
    )
  }

  if (isLock(family)) {
    return (
      <WidgetScene
        placement="lock"
        platform={platform}
        ink={ink}
        fit={fitFor(family)}
        date={model.date.gregorian}
        label={label}
        inline={family === 'inline' ? draw : undefined}>
        {family === 'inline' ? undefined : draw}
      </WidgetScene>
    )
  }
  return (
    <WidgetScene
      placement="home"
      platform={platform}
      ink={ink}
      fit={fitFor(family)}
      appName={APP_NAME}
      label={label}>
      {draw}
    </WidgetScene>
  )
}
