import { LinearGradient } from 'expo-linear-gradient'
import type { ReactElement } from 'react'
import { Text, View } from 'react-native'

import { arabic } from '../fonts'
import { useUi } from '../provider'

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

export const HOME_FAMILIES = ['small', 'medium', 'large'] as const
export type HomeFamily = (typeof HOME_FAMILIES)[number]

/** iOS's accessory families. Android has no Lock Screen widgets. */
export const LOCK_FAMILIES = ['circular', 'rectangular', 'inline'] as const
export type LockFamily = (typeof LOCK_FAMILIES)[number]

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

export interface PreviewInk {
  background: string
  backgroundEnd: string
  accent: string
  onAccent: string
  label: string
  secondaryLabel: string
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

type Tone = 'label' | 'secondary' | 'accent'
type Size =
  | 'largeTitle'
  | 'title'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'subheadline'
  | 'body'
  | 'footnote'
  | 'caption'

/** SwiftUI's text styles on the Tailwind scale, close enough for a preview. */
const TYPE: Record<Size, string> = {
  largeTitle: 'text-4xl font-bold',
  title: 'text-3xl font-bold',
  title2: 'text-2xl font-semibold',
  title3: 'text-xl font-semibold',
  headline: 'text-base font-semibold',
  subheadline: 'text-sm font-medium',
  body: 'text-base',
  footnote: 'text-sm',
  caption: 'text-xs',
}

/** Points, from the iPhone's own widget sizes; medium and large shrink to fit a narrow phone. */
const HOME_FRAME: Record<HomeFamily, { width: number; aspectRatio: number }> = {
  small: { width: 158, aspectRatio: 1 },
  medium: { width: 338, aspectRatio: 338 / 158 },
  large: { width: 338, aspectRatio: 338 / 354 },
}

interface Kit {
  say: (text: string, size: Size, tone?: Tone, lines?: number) => ReactElement
  heading: (text: string) => ReactElement
  row: (item: PreviewLink, mark?: ReactElement | null) => ReactElement
  /** A widget button, drawn but inert; compact is the round icon-only one. */
  button: (label: string, compact?: boolean) => ReactElement
  /** The button a markable row carries, or its tick once marked. */
  mark: (item: PreviewItem, label: string) => ReactElement | null
  spacer: ReactElement
}

function kitFor(ink: PreviewInk, lock: boolean): Kit {
  const color = (tone: Tone): string =>
    tone === 'label' || lock ? ink.label : tone === 'accent' ? ink.accent : ink.secondaryLabel
  const say = (text: string, size: Size, tone: Tone = 'label', lines = 1): ReactElement => (
    <Text
      numberOfLines={lines}
      className={`text-start ${TYPE[size]}`}
      style={{ color: color(tone), opacity: lock && tone === 'secondary' ? 0.7 : 1 }}>
      {text}
    </Text>
  )
  const button = (text: string, compact = false): ReactElement => (
    <View
      aria-label={text}
      className={compact ? 'items-center justify-center rounded-full' : 'rounded-full px-3 py-1'}
      style={[
        { backgroundColor: ink.accent },
        compact ? { width: 28, height: 28 } : { alignSelf: 'flex-start' },
      ]}>
      <Text className="font-semibold text-xs" style={{ color: ink.onAccent }}>
        {compact ? '✓' : text}
      </Text>
    </View>
  )
  return {
    say,
    heading: (text) => say(text, 'caption', 'accent'),
    row: (item, mark = null) => (
      <View key={item.url} className="flex-row items-center gap-2">
        <View className="flex-1">
          {say(item.title, 'subheadline')}
          {item.detail ? say(item.detail, 'caption', 'secondary') : null}
        </View>
        {mark}
      </View>
    ),
    button,
    mark: (item, label) => {
      if (item.since === undefined) return null
      if (item.done) {
        return (
          <Text className="font-semibold text-xs" style={{ color: ink.accent }}>
            ✓
          </Text>
        )
      }
      // A row's mark is the round, icon-only button, as on iOS.
      return button(label, true)
    },
    spacer: <View className="flex-1" />,
  }
}

interface Body {
  kit: Kit
  model: WidgetPreviewModel
  family: PreviewFamily
  ink: PreviewInk
}

/** A widget with nothing to show says so, in each family's own shape. */
function nothing({ kit, model, family }: Body, heading: string, glyph = '✓'): ReactElement {
  if (family === 'inline') return kit.say(model.labels.nothingNow, 'footnote')
  if (family === 'circular') return kit.say(glyph, 'title2')
  if (family === 'rectangular') return kit.say(model.labels.nothingNow, 'footnote', 'label', 3)
  return (
    <>
      {kit.heading(heading)}
      {kit.say(model.labels.nothingNow, 'headline', 'label', 4)}
    </>
  )
}

function rightNow({ kit, model, family, ink }: Body): ReactElement {
  const item = model.rightNow
  const labels = model.labels
  const title = item?.title ?? labels.nothingNow
  const caption = model.window ?? labels.rightNow
  if (family === 'inline') return kit.say(title, 'footnote')
  if (family === 'circular') {
    return kit.say(item ? `${1 + model.alsoNow.length}` : '✓', 'title2')
  }
  if (family === 'rectangular') {
    return (
      <>
        {kit.say(caption, 'caption', 'secondary')}
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
        <View className="flex-row items-center gap-1">
          <Text style={{ color: ink.accent }}>✓</Text>
          {compact ? null : kit.say(labels.markedDone, 'caption', 'secondary')}
        </View>
      )
    }
    if (repeat > 0 && !compact) {
      return (
        <View className="flex-row items-center gap-2">
          {kit.say(
            labels.countOf.replace('{count}', `${count}`).replace('{total}', `${repeat}`),
            'caption',
            'secondary',
          )}
          {kit.button(labels.addOne)}
        </View>
      )
    }
    return kit.button(labels.markDone, compact)
  }
  const footer = (compact: boolean): ReactElement => (
    <View className="flex-row items-end gap-2">
      <View className="flex-1">{kit.say(model.date.hijri, 'caption', 'secondary', 2)}</View>
      {action(compact)}
    </View>
  )
  const left = item ? model.remaining : null
  const remaining = left ? kit.say(left, 'caption', 'secondary') : null
  const more = model.moreNow ? kit.say(model.moreNow, 'caption', 'accent') : null

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
      {kit.say(title, 'title2', 'label', 3)}
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
  if (family === 'circular') return kit.say(next.prayer, 'caption')
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
      {kit.say(next.distance, 'title3', 'secondary')}
      {next.before.length > 0 ? kit.heading(labels.before) : null}
      {next.before.slice(0, 4).map((entry) => kit.row(entry))}
      {next.after.length > 0 ? kit.heading(labels.after) : null}
      {next.after.slice(0, 4).map((entry) => kit.row(entry))}
    </>
  )
}

function prayers(body: Body): ReactElement {
  const { kit, model, family, ink } = body
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
          ? { width: size, height: size, backgroundColor: ink.accent }
          : {
              width: size,
              height: size,
              borderWidth: 1.5,
              borderColor: prayer.passed ? ink.secondaryLabel : ink.label,
              borderStyle: prayer.passed ? 'dashed' : 'solid',
              opacity: prayer.passed ? 0.5 : 1,
            }
      }
    />
  )
  const dots = (size: number): ReactElement => (
    <View className="flex-row" style={{ gap: size / 2 }}>
      {all.map((prayer) => dot(prayer, size))}
    </View>
  )
  const tone = (prayer: (typeof all)[number]): Tone =>
    prayer.passed && !prayer.done ? 'secondary' : 'label'

  if (family === 'inline') return kit.say(`${labels.prayers} ${count}`, 'footnote')
  if (family === 'circular') return kit.say(count, 'headline')
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
            <View key={prayer.id} className="items-center gap-1">
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
        <View key={prayer.id} className="flex-row items-center gap-3">
          {dot(prayer, 24)}
          {kit.say(prayer.name, 'title3', tone(prayer))}
        </View>
      ))}
    </>
  )
}

function hijriDate({ kit, model, family }: Body): ReactElement {
  const date = model.date
  const detail = date.place ? `${date.gregorian} · ${date.place}` : date.gregorian
  if (family === 'inline') return kit.say(date.hijri, 'footnote')
  if (family === 'circular') return kit.say(String(date.hijriDay), 'title3')
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
      {kit.say(date.gregorian, 'title3', 'secondary')}
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
        {kit.say(`${asked.length}`, 'title3')}
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
  if (family === 'circular') return kit.say(`${entries.length}`, 'title2')
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
  if (family === 'circular') return kit.say(`${duas.length}`, 'title2')
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
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1">{duas.slice(0, 2).map(marked)}</View>
          <View className="flex-1 gap-1">{duas.slice(2, 4).map(marked)}</View>
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
  const { kit, model, family, ink } = body
  const dua = model.duaOfTheDay
  const labels = model.labels
  if (!dua) return nothing(body, labels.duaOfTheDay, '۞')
  // Arabic reads right to left and sits centred, whatever the app's language.
  const words = (size: Size, lines: number): ReactElement => (
    <Text
      numberOfLines={lines}
      className={`text-center ${TYPE[size]}`}
      style={{ color: ink.label, fontFamily: arabic, writingDirection: 'rtl' }}>
      {dua.arabic}
    </Text>
  )
  const saidIt = dua.done ? (
    <View className="flex-row items-center gap-1">
      <Text style={{ color: ink.accent }}>✓</Text>
      {kit.say(labels.marked, 'caption', 'secondary')}
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
  if (family === 'circular') return kit.say(total > 0 ? `${total}` : '✓', 'title2')
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
}

function isLock(family: PreviewFamily): family is LockFamily {
  return (LOCK_FAMILIES as readonly string[]).includes(family)
}

/**
 * A React Native drawing of one widget in one family, from the same timeline
 * entry the real widget renders: an approximation of the SwiftUI and Android
 * layouts, faithful in what it says and roughly in where. Home Screen widgets
 * take the model's ink for the scheme being rendered; Lock Screen ones are
 * one hue on a dark wallpaper, as iOS draws them.
 */
export function WidgetPreview({ widget, family, model, label }: WidgetPreviewProps): ReactElement {
  const { scheme } = useUi()
  const lock = isLock(family)
  // The Lock Screen tints its widgets white over the wallpaper; the dark ink stands in for both.
  const ink = lock ? model.ink.dark : model.ink[scheme]
  const kit = kitFor(ink, lock)
  const content = BODIES[widget]({ kit, model, family, ink })

  if (!lock) {
    const frame = HOME_FRAME[family as HomeFamily]
    return (
      <View role="img" aria-label={label} style={{ width: '100%', maxWidth: frame.width }}>
        <LinearGradient
          colors={[ink.background, ink.backgroundEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ aspectRatio: frame.aspectRatio, borderRadius: 22, overflow: 'hidden' }}>
          <View className="flex-1 gap-1 p-4">{content}</View>
        </LinearGradient>
      </View>
    )
  }

  const shape =
    family === 'circular'
      ? { width: 72, height: 72, borderRadius: 36 }
      : family === 'rectangular'
        ? { width: 172, minHeight: 72 }
        : { maxWidth: 260 }
  return (
    <LinearGradient
      role="img"
      aria-label={label}
      colors={[model.ink.dark.backgroundEnd, model.ink.dark.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        borderRadius: 24,
        paddingVertical: 24,
        paddingHorizontal: 32,
        alignItems: 'center',
      }}>
      <View
        className={family === 'circular' ? 'items-center justify-center' : 'justify-center'}
        style={[shape, { overflow: 'hidden' }]}>
        {/* iOS's AccessoryWidgetBackground: a translucent disc behind the round family only. */}
        {family === 'circular' ? (
          <View
            className="absolute inset-0"
            style={{ backgroundColor: ink.label, opacity: 0.16 }}
          />
        ) : null}
        {content}
      </View>
    </LinearGradient>
  )
}
