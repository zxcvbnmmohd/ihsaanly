import { resolveText } from '@ihsaanly/core/content/language'
import { type DetailLevel, firstSentence, type ReadingLayout } from '@ihsaanly/core/content/reading'
import type { Evidence, Ruling } from '@ihsaanly/core/content/schema'
import type { ReactElement, ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useColors, usePalette } from '../colors'
import { ArabicText } from '../components/arabic-text'
import { Button } from '../components/button'
import { Chip } from '../components/chip'
import { Counter } from '../components/counter'
import { EmptyState } from '../components/empty-state'
import { EvidencePanel } from '../components/evidence-panel'
import { Row } from '../components/row'
import { Screen } from '../components/screen'
import { Surface } from '../components/surface'
import { SwitchRow } from '../components/switch-row'
import { serif } from '../fonts'
import { useUi } from '../provider'

/** One text of a composite item, already resolved to the reader's language. */
export interface ItemPartDetail {
  id: string
  title: string
  arabic: string
  transliteration: string | null
  translation: string | null
  repeat: number
  /** Citation lines such as "Sahih Muslim 2723", already formatted. */
  source: string
}

export interface ItemDetail {
  ruling: Ruling
  rulingHref: string
  reviewed: boolean
  why: string | null
  how: string[]
  repeat: number
  arabic: string | null
  transliteration: string | null
  translation: string | null
  note: string | null
  evidence: Evidence[]
  /** The texts to say, in order; empty for an item that is a single text. */
  parts: ItemPartDetail[]
}

export interface CounterState {
  count: number
  target: number
}

export interface RemindState {
  value: boolean
  detail: string
}

export interface ItemScreenProps {
  /** The item's name, for the counter's spoken label. */
  title: string
  item: ItemDetail | null
  memoriseHref: string | null
  done: boolean
  onToggleDone: () => void
  /** Present only when the item is repeated; the count lives with the route. */
  counter: CounterState | null
  onTapCounter: () => void
  onResetCounter: () => void
  onToday: boolean
  onToggleOnToday: () => void
  /** Present only when a reminder can actually be scheduled for this item. */
  remind: RemindState | null
  onToggleRemind: (value: boolean) => void
  onShareText: () => void
  onShareImage: () => void
  /** Set by a host that keeps My duas: whether this item is pinned there. */
  pin?: { value: boolean; onToggle: () => void }
  /** Arabic before or after its translation, and how it is aligned. */
  reading: ReadingLayout
  /** Brief shows the why's first sentence and the evidence's citations only. */
  detail: DetailLevel
  onDetail: (detail: DetailLevel) => void
}

const DETAIL_LEVELS: readonly DetailLevel[] = ['brief', 'detailed']

interface LabelledProps {
  label: string
  children: ReactNode
}

interface PartCardProps {
  part: ItemPartDetail
  reading: ReadingLayout
}

interface ReadingTextProps {
  arabic: string
  transliteration: string | null
  translation: string | null
  reading: ReadingLayout
  variant: 'inline' | 'hero'
}

/**
 * The words to say and their meaning, in the reader's order and alignment.
 * The transliteration stays with the Arabic it spells out.
 */
function ReadingText({
  arabic,
  transliteration,
  translation,
  reading,
  variant,
}: ReadingTextProps): ReactElement {
  const colors = useColors()
  const align = reading.align === 'center' ? 'text-center' : 'text-start'
  const hero = variant === 'hero'
  const said = (
    <>
      <ArabicText variant={variant} align={reading.align}>
        {arabic}
      </ArabicText>
      {transliteration ? (
        <Text className={`${align} text-base italic`} style={{ color: colors.secondaryLabel }}>
          {transliteration}
        </Text>
      ) : null}
    </>
  )
  const meaning = translation ? (
    <Text
      className={`${align} text-base${hero ? '' : 'leading-relaxed'}`}
      style={{ color: hero ? colors.secondaryLabel : colors.label }}>
      {translation}
    </Text>
  ) : null

  return reading.arabicFirst ? (
    <>
      {said}
      {meaning}
    </>
  ) : (
    <>
      {meaning}
      {said}
    </>
  )
}

function PartCard({ part, reading }: PartCardProps): ReactElement {
  const colors = useColors()
  const { strings } = useUi()

  return (
    <Surface style={{ borderRadius: 20, padding: 18 }}>
      <View className="gap-3">
        <View className="flex-row flex-wrap items-baseline justify-between gap-2">
          <Text className="flex-1 font-semibold text-base" style={{ color: colors.label }}>
            {part.title}
          </Text>
          {part.repeat > 1 ? (
            <Text className="font-semibold text-sm" style={{ color: colors.accent }}>
              {strings.item.partRepeat(part.repeat)}
            </Text>
          ) : null}
        </View>
        <ReadingText
          arabic={part.arabic}
          transliteration={part.transliteration}
          translation={part.translation}
          reading={reading}
          variant="inline"
        />
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {part.source}
        </Text>
      </View>
    </Surface>
  )
}

function Labelled({ label, children }: LabelledProps): ReactElement {
  const colors = useColors()
  return (
    <View className="gap-1">
      <Text
        accessibilityRole="header"
        aria-level={2}
        className="font-semibold text-xs uppercase"
        style={{ color: colors.secondaryLabel }}>
        {label}
      </Text>
      {children}
    </View>
  )
}

export function ItemScreen({
  title,
  item,
  memoriseHref,
  done,
  onToggleDone,
  counter,
  onTapCounter,
  onResetCounter,
  onToday,
  onToggleOnToday,
  remind,
  onToggleRemind,
  onShareText,
  onShareImage,
  pin,
  reading,
  detail,
  onDetail,
}: ItemScreenProps): ReactElement {
  const colors = useColors()
  const { strings, Link } = useUi()
  const palette = usePalette()

  if (!item) {
    return <EmptyState message={strings.notFound.body} />
  }

  const brief = detail === 'brief'
  const canShorten =
    (item.why !== null && firstSentence(item.why) !== item.why.trim()) ||
    item.evidence.some((entry) => resolveText(entry.text) !== null)

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          <Link href={item.rulingHref} asChild>
            <Pressable accessibilityRole="link" accessibilityHint={strings.glossary.title}>
              <Text
                className="font-semibold text-sm"
                style={{ color: palette.accent, textDecorationLine: 'underline' }}>
                {strings.ruling[item.ruling]}
              </Text>
            </Pressable>
          </Link>
          {item.reviewed ? null : (
            <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
              · {strings.item.unreviewed}
            </Text>
          )}
        </View>
        {item.repeat > 1 ? (
          <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.item.repeat(item.repeat)}
          </Text>
        ) : null}
      </View>

      {item.arabic ? (
        <Surface style={{ borderRadius: 24, padding: 22 }}>
          <View className="gap-3">
            <ReadingText
              arabic={item.arabic}
              transliteration={item.transliteration}
              translation={item.translation}
              reading={reading}
              variant="hero"
            />
          </View>
        </Surface>
      ) : null}

      {counter && !done ? (
        <Counter
          label={title}
          count={counter.count}
          target={counter.target}
          onTap={onTapCounter}
          onReset={onResetCounter}
          resetLabel={strings.item.counterReset}
          palette={palette}
        />
      ) : null}

      {item.parts.length > 0 ? (
        <Labelled label={strings.item.parts}>
          <View className="gap-3">
            {item.parts.map((part) => (
              <PartCard key={part.id} part={part} reading={reading} />
            ))}
          </View>
        </Labelled>
      ) : null}

      {/* Only offered when Brief would leave something out. */}
      {canShorten ? (
        <View accessibilityRole="radiogroup" className="flex-row gap-2">
          {DETAIL_LEVELS.map((level) => (
            <Chip
              key={level}
              label={strings.item[level]}
              selected={detail === level}
              onPress={() => onDetail(level)}
              palette={palette}
            />
          ))}
        </View>
      ) : null}

      {item.why ? (
        <Labelled label={strings.item.why}>
          <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
            {brief ? firstSentence(item.why) : item.why}
          </Text>
        </Labelled>
      ) : null}

      {item.how.length > 0 ? (
        <Labelled label={strings.item.how}>
          <View className="gap-2">
            {item.how.map((step, index) => (
              <View key={step} className="flex-row gap-3">
                <Text
                  className="text-base"
                  style={{ fontFamily: serif, color: palette.accent, fontWeight: '600' }}>
                  {index + 1}
                </Text>
                <Text className="flex-1 text-base leading-relaxed" style={{ color: colors.label }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </Labelled>
      ) : null}

      {item.note ? (
        <Labelled label={strings.item.note}>
          <Text className="text-sm" style={{ color: colors.label }}>
            {item.note}
          </Text>
        </Labelled>
      ) : null}

      <View className="gap-2">
        <Button
          title={done ? strings.item.undo : strings.item.done}
          onPress={onToggleDone}
          variant={done ? 'secondary' : 'primary'}
          color={palette.accent}
          onColor={palette.onAccent}
        />
        {done ? (
          <Text className="text-center text-sm" style={{ color: colors.secondaryLabel }}>
            {strings.item.doneToday}
          </Text>
        ) : null}
      </View>

      <Labelled label={strings.item.yourDay}>
        <View className="gap-3">
          <SwitchRow
            title={strings.item.onToday}
            detail={strings.item.onTodayDetail}
            value={onToday}
            onValueChange={onToggleOnToday}
            accent={palette.accent}
            knob={palette.knob}
            track={palette.wash[1]}
          />
          {remind ? (
            <SwitchRow
              title={strings.item.remind}
              detail={remind.detail}
              value={remind.value}
              onValueChange={onToggleRemind}
              accent={palette.accent}
              knob={palette.knob}
              track={palette.wash[1]}
            />
          ) : null}
          {pin ? (
            <SwitchRow
              title={strings.myDuas.pin}
              detail={strings.myDuas.pinDetail}
              value={pin.value}
              onValueChange={pin.onToggle}
              accent={palette.accent}
              knob={palette.knob}
              track={palette.wash[1]}
            />
          ) : null}
        </View>
      </Labelled>

      <View className="gap-3">
        {memoriseHref ? <Row href={memoriseHref} title={strings.memorise.start} /> : null}
        <Row title={strings.item.shareText} onPress={onShareText} />
        <Row title={strings.item.shareImage} onPress={onShareImage} />
      </View>

      <EvidencePanel evidence={item.evidence} brief={brief} />
    </Screen>
  )
}
