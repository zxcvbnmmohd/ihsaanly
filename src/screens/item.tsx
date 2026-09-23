import type { ReactElement, ReactNode } from 'react'
import { Pressable, Text, useColorScheme, View } from 'react-native'

import { ArabicText } from '@/components/arabic-text'
import { Button } from '@/components/button'
import { Counter } from '@/components/counter'
import { EmptyState } from '@/components/empty-state'
import { EvidencePanel } from '@/components/evidence-panel'
import { Row } from '@/components/row'
import { Screen } from '@/components/screen'
import { Surface } from '@/components/surface'
import { SwitchRow } from '@/components/switch-row'
import { Link, type Href } from 'expo-router'

import type { Evidence, Ruling } from '@/content/schema'
import { useStrings } from '@/strings'
import { colors } from '@/theme/colors'
import { fonts } from '@/theme/fonts'
import { usePalette } from '@/theme/store'

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
  rulingHref: Href
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
  memoriseHref: Href | null
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
}

interface LabelledProps {
  label: string
  children: ReactNode
}

interface PartCardProps {
  part: ItemPartDetail
}

function PartCard({ part }: PartCardProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  return (
    <Surface style={{ borderRadius: 20, padding: 18 }}>
      <View className="gap-3">
        <View className="flex-row flex-wrap items-baseline justify-between gap-2">
          <Text className="flex-1 text-base font-semibold" style={{ color: colors.label }}>
            {part.title}
          </Text>
          {part.repeat > 1 ? (
            <Text className="text-sm font-semibold" style={{ color: palette.accent }}>
              {strings.item.partRepeat(part.repeat)}
            </Text>
          ) : null}
        </View>
        <ArabicText>{part.arabic}</ArabicText>
        {part.transliteration ? (
          <Text className="text-base italic" style={{ color: colors.secondaryLabel }}>
            {part.transliteration}
          </Text>
        ) : null}
        {part.translation ? (
          <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
            {part.translation}
          </Text>
        ) : null}
        <Text className="text-sm" style={{ color: colors.secondaryLabel }}>
          {part.source}
        </Text>
      </View>
    </Surface>
  )
}

function Labelled({ label, children }: LabelledProps): ReactElement {
  useColorScheme()

  return (
    <View className="gap-1">
      <Text className="text-xs font-semibold uppercase" style={{ color: colors.secondaryLabel }}>
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
}: ItemScreenProps): ReactElement {
  const strings = useStrings()
  const palette = usePalette()
  useColorScheme()

  if (!item) {
    return <EmptyState message={strings.notFound.body} />
  }

  return (
    <Screen palette={palette} className="gap-6 p-4">
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          <Link href={item.rulingHref} asChild>
            <Pressable accessibilityRole="link" accessibilityHint={strings.glossary.title}>
              <Text
                className="text-sm font-semibold"
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
          <View className="items-center gap-3">
            <ArabicText variant="hero">{item.arabic}</ArabicText>
            {item.transliteration ? (
              <Text
                className="text-center text-base italic"
                style={{ color: colors.secondaryLabel }}>
                {item.transliteration}
              </Text>
            ) : null}
            {item.translation ? (
              <Text className="text-center text-base" style={{ color: colors.secondaryLabel }}>
                {item.translation}
              </Text>
            ) : null}
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
              <PartCard key={part.id} part={part} />
            ))}
          </View>
        </Labelled>
      ) : null}

      {item.why ? (
        <Labelled label={strings.item.why}>
          <Text className="text-base leading-relaxed" style={{ color: colors.label }}>
            {item.why}
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
                  style={{ color: palette.accent, fontFamily: fonts.display, fontWeight: '600' }}>
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
        </View>
      </Labelled>

      <View className="gap-3">
        {memoriseHref ? <Row href={memoriseHref} title={strings.memorise.start} /> : null}
        <Row title={strings.item.shareText} onPress={onShareText} />
        <Row title={strings.item.shareImage} onPress={onShareImage} />
      </View>

      <EvidencePanel evidence={item.evidence} />
    </Screen>
  )
}
